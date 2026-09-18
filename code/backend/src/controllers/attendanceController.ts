import type { Request, Response } from "express";
import { z } from "zod";
import { mongo } from "mongoose";
import { UserModel } from "@/models/User.js";
import { AttendanceRecordModel } from "@/models/AttendanceRecord.js";
import type { Course } from "@/models/Course.js";
import { computeAttendance } from "@/utils/attendanceRules.js";
import { isDayString, toBogotaParts } from "@/utils/time.js";
import { normalizeDocument } from "@/utils/studentDocument.js";
import { env } from "@/config/env.js";
import type {
  ScanResponse,
  ScanConflictResponse,
  PracticeScanResponse,
  ScanConfigResponse,
  DocumentLookupResponse,
  AttendanceSource,
} from "@/types/contracts.js";

const scanQrSchema = z.object({
  qrToken: z.string().min(1),
});

const scanDocumentSchema = z.object({
  document: z.string().min(1),
});

const lookupDocumentQuerySchema = z.object({
  document: z.string().min(1),
});

function formatMin(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function isInsideScanWindow(now: Date): boolean {
  const { minutes } = toBogotaParts(now);
  return minutes >= env.scanWindow.startMin && minutes <= env.scanWindow.endMin;
}

/** Busca al estudiante por QR. No responde nada: el llamador decide el 400/404. */
async function findStudentByQr(qrToken: string) {
  const student = await UserModel.findOne({
    qrToken,
    role: "estudiante",
    // $ne: false a propósito: documentos previos a la migración no tienen `active`
    active: { $ne: false },
  }).populate<{ course: Course | null }>("course", "name");

  if (!student || !student.course) return null;
  return { student, course: student.course };
}

/** Forma resuelta común a búsqueda por QR y por documento: estudiante + curso ya poblado. */
type FoundStudent = NonNullable<Awaited<ReturnType<typeof findStudentByQr>>>;

/**
 * Busca al estudiante por documento de identidad. Normaliza igual que el alta
 * (studentDocument.ts) porque así se guarda en la BD; si no aparece, reintenta
 * con el valor crudo recortado como salvaguarda ante datos legados sin normalizar.
 */
async function findStudentByDocument(rawDocument: string): Promise<FoundStudent | null> {
  const normalized = normalizeDocument(rawDocument);
  const baseFilter = { role: "estudiante" as const, active: { $ne: false } };

  let student = await UserModel.findOne({ ...baseFilter, document: normalized }).populate<{ course: Course | null }>(
    "course",
    "name"
  );

  if (!student) {
    const raw = rawDocument.trim();
    if (raw && raw !== normalized) {
      student = await UserModel.findOne({ ...baseFilter, document: raw }).populate<{ course: Course | null }>(
        "course",
        "name"
      );
    }
  }

  if (!student || !student.course) return null;
  return { student, course: student.course };
}

/** Valida `{ qrToken }` en el body y busca al estudiante. Responde 400/404 y devuelve null si no aplica. */
async function resolveStudentByQr(req: Request, res: Response): Promise<FoundStudent | null> {
  const parsed = scanQrSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "qrToken requerido" });
    return null;
  }

  const found = await findStudentByQr(parsed.data.qrToken);
  if (!found) {
    res.status(404).json({ error: "QR no corresponde a un estudiante activo con curso" });
    return null;
  }
  return found;
}

/** Valida `{ document }` en el body y busca al estudiante. Responde 400/404 y devuelve null si no aplica. */
async function resolveStudentByDocument(req: Request, res: Response): Promise<FoundStudent | null> {
  const parsed = scanDocumentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "document requerido" });
    return null;
  }

  const found = await findStudentByDocument(parsed.data.document);
  if (!found) {
    res.status(404).json({ error: "No se encontró un estudiante activo con ese documento" });
    return null;
  }
  return found;
}

function toStudentAndCourseRef(found: FoundStudent) {
  return {
    student: { id: found.student._id.toString(), name: found.student.name },
    course: { id: found.course._id.toString(), name: found.course.name },
  };
}

/** Clasifica sin persistir: usado por los dos modos práctica (QR y documento). */
function buildPracticeResponse(found: FoundStudent, now: Date): PracticeScanResponse {
  const { day, status, points, minutesLate } = computeAttendance(now);
  return {
    ...toStudentAndCourseRef(found),
    day,
    status,
    points,
    minutesLate,
    scannedAt: now.toISOString(),
    practice: true,
  };
}

/** Núcleo compartido por scanQr/scanDocument: crea el registro (o responde el 409 de duplicado). */
async function performScan(req: Request, res: Response, found: FoundStudent, source: AttendanceSource, now: Date): Promise<void> {
  const { day, status, points, minutesLate } = computeAttendance(now);

  let record;
  try {
    // Único create: PROHIBIDO findOne previo (condición de carrera). La idempotencia
    // la garantiza el índice único { student, day }, capturado abajo como E11000.
    record = await AttendanceRecordModel.create({
      student: found.student._id,
      course: found.course._id,
      day,
      scannedAt: now,
      status,
      points,
      minutesLate,
      source,
      scannedBy: req.user!.sub,
      justified: false,
    });
  } catch (err) {
    if (err instanceof mongo.MongoServerError && err.code === 11000) {
      const existing = await AttendanceRecordModel.findOne({ student: found.student._id, day });
      const body: ScanConflictResponse = {
        error: "Este estudiante ya tiene registro hoy",
        existing: {
          day: existing!.day,
          status: existing!.status,
          points: existing!.points,
          scannedAt: existing!.scannedAt.toISOString(),
        },
      };
      res.status(409).json(body);
      return;
    }
    throw err;
  }

  const body: ScanResponse = {
    ...toStudentAndCourseRef(found),
    day: record.day,
    status: record.status,
    points: record.points,
    minutesLate: record.minutesLate,
    scannedAt: record.scannedAt.toISOString(),
  };
  res.status(201).json(body);
}

// Profesor/coordinación: si la portería está restringida por hora y cuál es la ventana
export function getScanConfig(_req: Request, res: Response): void {
  const body: ScanConfigResponse = {
    windowEnforced: env.scanWindow.enforced,
    windowStartMin: env.scanWindow.startMin,
    windowEndMin: env.scanWindow.endMin,
  };
  res.json(body);
}

// Modo práctica (capacitación): clasifica igual que el escaneo real pero NUNCA guarda nada
export async function practiceScan(req: Request, res: Response): Promise<void> {
  const found = await resolveStudentByQr(req, res);
  if (!found) return;
  res.json(buildPracticeResponse(found, new Date()));
}

// Modo práctica por documento: misma clasificación, tampoco guarda nada
export async function practiceScanDocument(req: Request, res: Response): Promise<void> {
  const found = await resolveStudentByDocument(req, res);
  if (!found) return;
  res.json(buildPracticeResponse(found, new Date()));
}

// Profesor escanea QR del estudiante en portería
export async function scanQr(req: Request, res: Response): Promise<void> {
  const now = new Date(); // el servidor fija SIEMPRE la hora, el cliente nunca la envía

  if (env.scanWindow.enforced && !isInsideScanWindow(now)) {
    res.status(403).json({
      error: `Portería cerrada: solo se registra entre ${formatMin(env.scanWindow.startMin)} y ${formatMin(env.scanWindow.endMin)}`,
    });
    return;
  }

  const found = await resolveStudentByQr(req, res);
  if (!found) return;

  await performScan(req, res, found, "qr", now);
}

// Profesor registra al estudiante por documento (sin QR a mano). Mismas reglas que scanQr.
export async function scanDocument(req: Request, res: Response): Promise<void> {
  const now = new Date(); // el servidor fija SIEMPRE la hora, el cliente nunca la envía

  if (env.scanWindow.enforced && !isInsideScanWindow(now)) {
    res.status(403).json({
      error: `Portería cerrada: solo se registra entre ${formatMin(env.scanWindow.startMin)} y ${formatMin(env.scanWindow.endMin)}`,
    });
    return;
  }

  const found = await resolveStudentByDocument(req, res);
  if (!found) return;

  await performScan(req, res, found, "documento", now);
}

// Profesor: busca al estudiante por documento antes de confirmar el registro manual. No crea asistencia.
export async function lookupDocument(req: Request, res: Response): Promise<void> {
  const parsed = lookupDocumentQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "document requerido" });
    return;
  }

  const found = await findStudentByDocument(parsed.data.document);
  if (!found) {
    res.status(404).json({ error: "No se encontró un estudiante activo con ese documento" });
    return;
  }

  const { day } = toBogotaParts(new Date());
  const alreadyToday = await AttendanceRecordModel.exists({ student: found.student._id, day });

  const body: DocumentLookupResponse = {
    ...toStudentAndCourseRef(found),
    alreadyToday: Boolean(alreadyToday),
  };
  res.json(body);
}

// Estudiante: su propio historial
export async function getMyAttendance(req: Request, res: Response): Promise<void> {
  const records = await AttendanceRecordModel.find({ student: req.user!.sub })
    .populate("course", "name")
    .sort({ day: -1, scannedAt: -1 });

  res.json(records);
}

// Coordinación: detalle individual
export async function listAttendance(req: Request, res: Response): Promise<void> {
  const { courseId, from, to } = req.query as { courseId?: string; from?: string; to?: string };

  if ((from && !isDayString(from)) || (to && !isDayString(to))) {
    res.status(400).json({ error: "from y to deben tener formato YYYY-MM-DD" });
    return;
  }

  const filter: Record<string, unknown> = {};
  if (courseId) filter.course = courseId;
  if (from || to) {
    filter.day = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    };
  }

  const records = await AttendanceRecordModel.find(filter)
    .populate("student", "name email")
    .populate("course", "name")
    .sort({ day: -1, scannedAt: -1 });

  res.json(records);
}
