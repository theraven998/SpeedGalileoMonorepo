import { Router } from "express";
import { scanQr, listAttendance, getMyAttendance } from "@/controllers/attendanceController.js";
import { requireAuth, requireRole } from "@/middleware/auth.js";

export const attendanceRoutes = Router();

attendanceRoutes.post("/scan", requireAuth, requireRole("profesor"), scanQr);
attendanceRoutes.get("/me", requireAuth, requireRole("estudiante"), getMyAttendance);
attendanceRoutes.get("/", requireAuth, requireRole("coordinacion"), listAttendance);
