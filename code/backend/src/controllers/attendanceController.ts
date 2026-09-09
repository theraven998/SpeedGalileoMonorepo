import type { Request, Response } from "express";
import { z } from "zod";
import { UserModel } from "@/models/User.js";
import { AttendanceRecordModel } from "@/models/AttendanceRecord.js";
import { computeAttendance } from "@/utils/attendanceRules.js";

const scanSchema = z.object({
  qrToken: z.string().min(1),
});

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Profesor escanea QR del estudiante en portería
export async function scanQr(req: Request, res: Response): Promise<void> {
  const parsed = scanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "qrToken requerido" });
    return;
  }

  const student = await UserModel.findOne({ qrToken: parsed.data.qrToken, role: "estudiante" });
  if (!student || !student.course) {
    res.status(404).json({ error: "Estudiante no encontrado o sin curso asignado" });
    return;
  }

  const now = new Date();
  const already = await AttendanceRecordModel.findOne({
    student: student._id,
    scannedAt: { $gte: startOfDay(now) },
  });
  if (already) {
    res.status(409).json({ error: "Este estudiante ya tiene registro hoy" });
    return;
  }

  const { status, points } = computeAttendance(now);

  const record = await AttendanceRecordModel.create({
    student: student._id,
    course: student.course,
    scannedAt: now,
    status,
    points,
    scannedBy: req.user!.sub,
  });

  res.status(201).json({
    student: { id: student._id, name: student.name },
    status: record.status,
    points: record.points,
    scannedAt: record.scannedAt,
  });
}

// Estudiante: su propio historial
export async function getMyAttendance(req: Request, res: Response): Promise<void> {
  const records = await AttendanceRecordModel.find({ student: req.user!.sub })
    .populate("course", "name")
    .sort({ scannedAt: -1 });

  res.json(records);
}

// Coordinación: detalle individual
export async function listAttendance(req: Request, res: Response): Promise<void> {
  const { courseId, from, to } = req.query as { courseId?: string; from?: string; to?: string };

  const filter: Record<string, unknown> = {};
  if (courseId) filter.course = courseId;
  if (from || to) {
    filter.scannedAt = {
      ...(from ? { $gte: new Date(from) } : {}),
      ...(to ? { $lte: new Date(to) } : {}),
    };
  }

  const records = await AttendanceRecordModel.find(filter)
    .populate("student", "name email")
    .populate("course", "name")
    .sort({ scannedAt: -1 });

  res.json(records);
}
