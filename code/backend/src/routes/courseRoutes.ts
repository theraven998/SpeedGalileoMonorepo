import { Router } from "express";
import { listCourses } from "@/controllers/courseController.js";

export const courseRoutes = Router();

// Público: el formulario de autorregistro de estudiantes necesita listar cursos sin login.
courseRoutes.get("/", listCourses);
