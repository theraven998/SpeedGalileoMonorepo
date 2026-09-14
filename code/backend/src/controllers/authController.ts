import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "@/config/env.js";
import { UserModel, ROLES, type User } from "@/models/User.js";

function signToken(user: User): string {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, courseId: user.course?.toString() },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] }
  );
}

function toAuthUser(user: User) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    course: user.course,
    // solo tiene sentido pa' estudiantes: es lo que muestran pa' que los escaneen en portería
    qrToken: user.role === "estudiante" ? user.qrToken : undefined,
    mustChangePassword: user.mustChangePassword ?? false,
  };
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;
  const user = await UserModel.findOne({ email });
  if (!user) {
    res.status(401).json({ error: "Credenciales incorrectas" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Credenciales incorrectas" });
    return;
  }

  res.json({ token: signToken(user), user: toAuthUser(user) });
}

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(ROLES),
  courseId: z.string().optional(),
});

// Solo coordinación crea usuarios (protegido en la ruta con requireRole)
export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.flatten() });
    return;
  }

  const { name, email, password, role, courseId } = parsed.data;
  const exists = await UserModel.findOne({ email });
  if (exists) {
    res.status(409).json({ error: "Email ya registrado" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const qrToken = role === "estudiante" ? randomUUID() : undefined;

  const user = await UserModel.create({
    name,
    email,
    passwordHash,
    role,
    course: courseId,
    qrToken,
  });

  res.status(201).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    qrToken: user.qrToken,
  });
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string(),
});

// Cualquier rol cambia su propia contraseña. Obligatorio tras un alta de coordinación.
export async function changeMyPassword(req: Request, res: Response): Promise<void> {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.flatten() });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;
  if (newPassword.length < 8) {
    res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres" });
    return;
  }

  const user = await UserModel.findById(req.user!.sub);
  if (!user) {
    res.status(401).json({ error: "Usuario no encontrado" });
    return;
  }

  const currentValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!currentValid) {
    res.status(401).json({ error: "La contraseña actual no coincide" });
    return;
  }

  const sameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash);
  if (sameAsCurrent) {
    res.status(400).json({ error: "La nueva contraseña debe ser distinta a la actual" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await UserModel.updateOne({ _id: user._id }, { $set: { passwordHash, mustChangePassword: false } });

  res.status(204).end();
}
