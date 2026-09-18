import type { Request, Response } from "express";
import { z } from "zod";
import { mongo } from "mongoose";
import { UserModel } from "@/models/User.js";
import { AttendanceRecordModel } from "@/models/AttendanceRecord.js";
import type { Course } from "@/models/Course.js";
import { computeAttendance } from "@/utils/attendanceRules.js";
import { isDayString, toBogotaParts } from "@/utils/time.js";
import { env } from "@/config/env.js";
import type {
  ScanResponse,
  ScanConflictResponse,
  PracticeScanResponse,
  ScanConfigResponse,
} from "@/types/contracts.js";

const scanSchema = z.object({
  qrToken: z.string().min(1),
});

function formatMin(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function isInsideScanWindow(now: Date): boolean {
  const { minutes } = toBogotaParts(now);
  return minutes >= env.scanWindow.startMin && minutes <= env.scanWindow.endMin;
}

/** Valida el body y busca al estudiante. Responde 400/404 y devuelve null si no aplica. */
async function findScannedStudent(req: Request, res: Response) {
  const parsed = scanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "qrToken requerido" });
    return null;
  }

  // $ne: false a propósito: documentos previos a la migración no tienen `active`
  const student = await UserModel.findOne({
    qrToken: parsed.data.qrToken,
    role: "estudiante",
    active: { $ne: false },
  }).populate<{ course: Course | null }>("course", "name");

  if (!student || !student.course) {
    res.status(404).json({ error: "QR no corresponde a un estudiante activo con curso" });
    return null;
  }
  return { student, course: student.course };
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
  const found = await findScannedStudent(req, res);
  if (!found) return;
  const { student, course } = found;

  const now = new Date();
  const { day, status, points, minutesLate } = computeAttendance(now);
  const body: PracticeScanResponse = {
    student: { id: student._id.toString(), name: student.name },
    course: { id: course._id.toString(), name: course.name },
    day,
    status,
    points,
    minutesLate,
    scannedAt: now.toISOString(),
    practice: true,
  };
  res.json(body);
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

  const found = await findScannedStudent(req, res);
  if (!found) return;
  const { student, course } = found;

  const { day, status, points, minutesLate } = computeAttendance(now);

  let record;
  try {
    // Único create: PROHIBIDO findOne previo (condición de carrera). La idempotencia
    // la garantiza el índice único { student, day }, capturado abajo como E11000.
    record = await AttendanceRecordModel.create({
      student: student._id,
      course: course._id,
      day,
      scannedAt: now,
      status,
      points,
      minutesLate,
      source: "qr",
      scannedBy: req.user!.sub,
      justified: false,
    });
  } catch (err) {
    if (err instanceof mongo.MongoServerError && err.code === 11000) {
      const existing = await AttendanceRecordModel.findOne({ student: student._id, day });
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
    student: { id: student._id.toString(), name: student.name },
    course: { id: course._id.toString(), name: course.name },
    day: record.day,
    status: record.status,
    points: record.points,
    minutesLate: record.minutesLate,
    scannedAt: record.scannedAt.toISOString(),
  };
  res.status(201).json(body);
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
