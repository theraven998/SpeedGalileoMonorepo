import { Router } from "express";
import { login, register, changeMyPassword } from "@/controllers/authController.js";
import { requireAuth, requireRole } from "@/middleware/auth.js";

export const authRoutes = Router();

authRoutes.post("/login", login);
// Solo coordinación registra usuarios (profesores, estudiantes, otros coordinadores)
authRoutes.post("/register", requireAuth, requireRole("coordinacion"), register);
// Cualquier rol autenticado cambia su propia contraseña
authRoutes.patch("/me/password", requireAuth, changeMyPassword);
