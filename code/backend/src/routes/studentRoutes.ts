import { Router } from "express";
import { createStudent, listStudents } from "@/controllers/studentController.js";
import { requireAuth, requireRole } from "@/middleware/auth.js";

export const studentRoutes = Router();

// Alta individual y listado: solo coordinación (los estudiantes no usan celular en el colegio).
studentRoutes.post("/", requireAuth, requireRole("coordinacion"), createStudent);
studentRoutes.get("/", requireAuth, requireRole("coordinacion"), listStudents);
