import { Router } from "express";
import { scanQr, practiceScan, getScanConfig, listAttendance, getMyAttendance } from "@/controllers/attendanceController.js";
import { requireAuth, requireRole } from "@/middleware/auth.js";

export const attendanceRoutes = Router();

attendanceRoutes.post("/scan", requireAuth, requireRole("profesor"), scanQr);
attendanceRoutes.post("/practice-scan", requireAuth, requireRole("profesor"), practiceScan);
attendanceRoutes.get("/scan-config", requireAuth, requireRole("profesor", "coordinacion"), getScanConfig);
attendanceRoutes.get("/me", requireAuth, requireRole("estudiante"), getMyAttendance);
attendanceRoutes.get("/", requireAuth, requireRole("coordinacion"), listAttendance);
