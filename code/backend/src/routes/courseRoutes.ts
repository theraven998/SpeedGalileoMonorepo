import { Router } from "express";
import { listAdminCourses, listCourses } from "@/controllers/courseController.js";
import { requireAuth, requireRole } from "@/middleware/auth.js";

export const courseRoutes = Router();

// Coordinación: detalle completo, incluye group/enrollment/active/registered.
courseRoutes.get("/admin", requireAuth, requireRole("coordinacion"), listAdminCourses);

// Público: el formulario de autorregistro de estudiantes necesita listar cursos sin login.
courseRoutes.get("/", listCourses);
