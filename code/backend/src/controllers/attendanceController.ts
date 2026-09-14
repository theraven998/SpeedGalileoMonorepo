import type { Request, Response } from "express";
import { z } from "zod";
import { mongo } from "mongoose";
import { UserModel } from "@/models/User.js";
import { AttendanceRecordModel } from "@/models/AttendanceRecord.js";
import type { Course } from "@/models/Course.js";
import { computeAttendance } from "@/utils/attendanceRules.js";
import { isDayString } from "@/utils/time.js";
import type { ScanResponse, ScanConflictResponse } from "@/types/contracts.js";

const scanSchema = z.object({
  qrToken: z.string().min(1),
});

// Profesor escanea QR del estudiante en portería
export async function scanQr(req: Request, res: Response): Promise<void> {
  const parsed = scanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "qrToken requerido" });
    return;
  }

  // $ne: false a propósito: documentos previos a la migración no tienen `active`
  const student = await UserModel.findOne({
    qrToken: parsed.data.qrToken,
    role: "estudiante",
    active: { $ne: false },
  }).populate<{ course: Course | null }>("course", "name");

  if (!student || !student.course) {
    res.status(404).json({ error: "QR no corresponde a un estudiante activo con curso" });
    return;
  }

  const now = new Date(); // el servidor fija SIEMPRE la hora, el cliente nunca la envía
  const { day, status, points, minutesLate } = computeAttendance(now);

  let record;
  try {
    // Único create: PROHIBIDO findOne previo (condición de carrera). La idempotencia
    // la garantiza el índice único { student, day }, capturado abajo como E11000.
    record = await AttendanceRecordModel.create({
      student: student._id,
      course: student.course._id,
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
    course: { id: student.course._id.toString(), name: student.course.name },
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
