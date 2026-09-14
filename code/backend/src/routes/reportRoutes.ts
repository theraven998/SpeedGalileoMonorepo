import { Router } from "express";
import { getSummary } from "@/controllers/reportController.js";
import { requireAuth, requireRole } from "@/middleware/auth.js";

export const reportRoutes = Router();

// Coordinación: base del informe a rectoría (intervención y control).
reportRoutes.get("/summary", requireAuth, requireRole("coordinacion"), getSummary);
