import { Router } from "express";
import { login, register, signupEstudiante, changeMyPassword } from "@/controllers/authController.js";
import { requireAuth, requireRole } from "@/middleware/auth.js";

export const authRoutes = Router();

authRoutes.post("/login", login);
// Solo coordinación registra usuarios (profesores, estudiantes, otros coordinadores)
authRoutes.post("/register", requireAuth, requireRole("coordinacion"), register);
// Autorregistro público de estudiantes, requiere código de invitación del curso
authRoutes.post("/signup-estudiante", signupEstudiante);
// Cualquier rol autenticado cambia su propia contraseña
authRoutes.patch("/me/password", requireAuth, changeMyPassword);
