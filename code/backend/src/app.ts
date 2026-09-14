import express from "express";
import cors from "cors";
import { env } from "@/config/env.js";
import { authRoutes } from "@/routes/authRoutes.js";
import { attendanceRoutes } from "@/routes/attendanceRoutes.js";
import { rankingRoutes } from "@/routes/rankingRoutes.js";
import { courseRoutes } from "@/routes/courseRoutes.js";
import { reportRoutes } from "@/routes/reportRoutes.js";
import { studentRoutes } from "@/routes/studentRoutes.js";

export const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/ranking", rankingRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/students", studentRoutes);
