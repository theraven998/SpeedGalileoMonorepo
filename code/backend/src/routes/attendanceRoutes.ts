import { Router } from "express";
import {
  scanQr,
  scanDocument,
  practiceScan,
  practiceScanDocument,
  lookupDocument,
  getScanConfig,
  listAttendance,
  getMyAttendance,
} from "@/controllers/attendanceController.js";
import { requireAuth, requireRole } from "@/middleware/auth.js";

export const attendanceRoutes = Router();

attendanceRoutes.post("/scan", requireAuth, requireRole("profesor"), scanQr);
attendanceRoutes.post("/practice-scan", requireAuth, requireRole("profesor"), practiceScan);
// Registro sin QR: el profesor busca al estudiante por documento y confirma antes de registrar.
attendanceRoutes.get("/lookup-document", requireAuth, requireRole("profesor"), lookupDocument);
attendanceRoutes.post("/scan-document", requireAuth, requireRole("profesor"), scanDocument);
attendanceRoutes.post("/practice-scan-document", requireAuth, requireRole("profesor"), practiceScanDocument);
attendanceRoutes.get("/scan-config", requireAuth, requireRole("profesor", "coordinacion"), getScanConfig);
attendanceRoutes.get("/me", requireAuth, requireRole("estudiante"), getMyAttendance);
attendanceRoutes.get("/", requireAuth, requireRole("coordinacion"), listAttendance);
