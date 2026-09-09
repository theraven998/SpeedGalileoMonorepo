import { Router } from "express";
import { getRanking } from "@/controllers/rankingController.js";

export const rankingRoutes = Router();

// Público, sin auth: tablero de ranking por curso
rankingRoutes.get("/", getRanking);
