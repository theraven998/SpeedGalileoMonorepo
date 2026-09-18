import { Router } from "express";
import { createStudent, listStudents, listStudentQrs, lookupQr } from "@/controllers/studentController.js";
import { requireAuth, requireRole } from "@/middleware/auth.js";

export const studentRoutes = Router();

// Alta individual y listado: solo coordinación (los estudiantes no usan celular en el colegio).
studentRoutes.post("/", requireAuth, requireRole("coordinacion"), createStudent);
studentRoutes.get("/", requireAuth, requireRole("coordinacion"), listStudents);
// Export masivo con qrToken, exclusivo para imprimir stickers.
studentRoutes.get("/qrs", requireAuth, requireRole("coordinacion"), listStudentQrs);
// Validador de sticker: solo el nombre, no crea asistencia. Coordinación y portería lo pueden usar.
studentRoutes.get("/qr-lookup", requireAuth, requireRole("coordinacion", "profesor"), lookupQr);
