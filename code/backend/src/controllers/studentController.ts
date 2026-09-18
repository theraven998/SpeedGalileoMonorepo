import type { Request, Response } from "express";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { mongo, Types } from "mongoose";
import { UserModel, type User } from "@/models/User.js";
import { CourseModel, type Course } from "@/models/Course.js";
import { normalizeDocument, isValidDocument } from "@/utils/studentDocument.js";
import { generateTempPassword } from "@/utils/tempPassword.js";
import type { AdminStudentDto, CreateStudentResponse, StudentQrDto, QrLookupResponse } from "@/types/contracts.js";

function newQrToken(): string {
  return randomBytes(16).toString("base64url");
}

type StudentLike = Pick<User, "name" | "email" | "document" | "active" | "mustChangePassword"> & {
  _id: Types.ObjectId;
  createdAt: Date;
};

/** Vista de coordinación. Nunca incluye qrToken ni passwordHash. */
function toAdminStudentDto(user: StudentLike, course: Course | null): AdminStudentDto {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    document: user.document ?? "", // altas antiguas autorregistradas no tienen documento
    course: course ? { id: course._id.toString(), name: course.name } : { id: "", name: "" },
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
  };
}

const createStudentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  document: z.string().min(1),
  courseId: z.string().min(1),
});

// Alta individual hecha por coordinación (los estudiantes no usan celular en el colegio).
export async function createStudent(req: Request, res: Response): Promise<void> {
  const parsed = createStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  const { name, email, courseId } = parsed.data;
  const document = normalizeDocument(parsed.data.document);

  if (!isValidDocument(document)) {
    res.status(400).json({ error: "Documento inválido: usa solo números o letras, entre 5 y 15 caracteres" });
    return;
  }

  if (!Types.ObjectId.isValid(courseId)) {
    res.status(404).json({ error: "El curso no existe o está inactivo" });
    return;
  }
  const course = await CourseModel.findOne({ _id: courseId, active: { $ne: false } });
  if (!course) {
    res.status(404).json({ error: "El curso no existe o está inactivo" });
    return;
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  let user: User | null = null;
  let qrToken = newQrToken();
  let retriedQrToken = false;

  // Único create: PROHIBIDO buscar duplicados antes. El E11000 de los índices
  // únicos { email }, { document } y { qrToken } es lo que detecta el choque.
  while (!user) {
    try {
      user = await UserModel.create({
        name,
        email,
        passwordHash,
        role: "estudiante",
        course: course._id,
        document,
        qrToken,
        mustChangePassword: true,
        active: true,
      });
    } catch (err) {
      if (err instanceof mongo.MongoServerError && err.code === 11000) {
        const key = Object.keys(err.keyPattern ?? err.keyValue ?? {})[0];

        if (key === "document") {
          const existing = await UserModel.findOne({ document }).populate<{ course: Course | null }>(
            "course",
            "name"
          );
          const courseName = existing?.course?.name ?? "sin curso";
          res.status(409).json({
            error: `Ya existe un estudiante con el documento ${document}: ${existing?.name ?? ""} (${courseName})`,
          });
          return;
        }
        if (key === "email") {
          res.status(409).json({ error: `Ya existe un usuario con el correo ${email}` });
          return;
        }
        if (key === "qrToken" && !retriedQrToken) {
          // Colisión prácticamente imposible: un solo reintento con token nuevo.
          retriedQrToken = true;
          qrToken = newQrToken();
          continue;
        }
        throw err;
      }
      throw err;
    }
  }

  const body: CreateStudentResponse = {
    student: toAdminStudentDto(user, course),
    tempPassword,
    qrToken,
  };
  res.status(201).json(body);
}

const listStudentsQuerySchema = z.object({
  courseId: z.string().min(1).optional(),
});

// Coordinación: listado de estudiantes, opcionalmente filtrado por curso.
export async function listStudents(req: Request, res: Response): Promise<void> {
  const parsed = listStudentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  const { courseId } = parsed.data;
  if (courseId && !Types.ObjectId.isValid(courseId)) {
    res.status(400).json({ error: "courseId inválido" });
    return;
  }

  const filter: Record<string, unknown> = { role: "estudiante" };
  if (courseId) filter.course = courseId;

  const students = await UserModel.find(filter)
    .populate<{ course: Course | null }>("course", "name")
    .sort({ name: 1 });

  const dto: AdminStudentDto[] = students.map((student) => toAdminStudentDto(student, student.course));
  res.json(dto);
}

function toStudentQrDto(user: StudentLike & { qrToken?: string | null }, course: Course | null): StudentQrDto {
  return {
    id: user._id.toString(),
    name: user.name,
    document: user.document ?? "",
    course: course ? { id: course._id.toString(), name: course.name } : { id: "", name: "" },
    qrToken: user.qrToken ?? "",
  };
}

// Coordinación: único endpoint que expone qrToken en bulto, exclusivo para impresión masiva de stickers.
export async function listStudentQrs(req: Request, res: Response): Promise<void> {
  const parsed = listStudentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  const { courseId } = parsed.data;
  if (courseId && !Types.ObjectId.isValid(courseId)) {
    res.status(400).json({ error: "courseId inválido" });
    return;
  }

  // active: $ne: false a propósito, igual que scanQr: no imprimir sticker de estudiantes desactivados.
  const filter: Record<string, unknown> = {
    role: "estudiante",
    active: { $ne: false },
    qrToken: { $exists: true, $ne: null },
  };
  if (courseId) filter.course = courseId;

  const students = await UserModel.find(filter)
    .populate<{ course: Course | null }>("course", "name")
    .sort({ name: 1 });

  const dto: StudentQrDto[] = students.map((student) => toStudentQrDto(student, student.course));
  res.json(dto);
}

const qrLookupQuerySchema = z.object({ token: z.string().min(1) });

// Validador de sticker: solo dice a quién pertenece el QR. Nunca crea asistencia ni expone más datos.
export async function lookupQr(req: Request, res: Response): Promise<void> {
  const parsed = qrLookupQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "token requerido" });
    return;
  }

  const student = await UserModel.findOne({
    qrToken: parsed.data.token,
    role: "estudiante",
    active: { $ne: false },
  });

  if (!student) {
    res.status(404).json({ error: "QR no corresponde a un estudiante activo" });
    return;
  }

  const dto: QrLookupResponse = { name: student.name };
  res.json(dto);
}
