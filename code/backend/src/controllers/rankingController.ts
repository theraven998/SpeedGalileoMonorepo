import type { Request, Response } from "express";
import { CourseModel } from "@/models/Course.js";
import { computeCourseStats, type CourseForMetrics } from "@/services/metrics.js";
import { toBogotaParts, addDays } from "@/utils/time.js";
import { lectivoDaysInRange } from "@/utils/holidays.js";
import { PILOT_PERIOD, type Period } from "@/config/periods.js";
import { LATE_CUTOFF_MIN, type RankingEntryDto, type CourseGroup } from "@/types/contracts.js";

/**
 * Ventana de días evaluables del ranking público (00-dominio.md §7.1).
 * Días lectivos desde `period.from` hasta `min(hoy, period.to)`, en Bogotá.
 * El día en curso solo entra después de las 07:30 (LATE_CUTOFF_MIN), cuando
 * el conteo de puntuales ya es definitivo. Pura, exportada para pruebas.
 */
export function rankingWindow(now: Date, period: Period): string[] {
  const { day: today, minutes } = toBogotaParts(now);
  let lastDay = today < period.to ? today : period.to;

  if (lastDay === today && minutes <= LATE_CUTOFF_MIN) {
    lastDay = addDays(today, -1);
  }

  return lectivoDaysInRange(period.from, lastDay);
}

// Tablero público: % de puntualidad por curso de intervención. Nunca expone
// nombres de estudiantes, conteos individuales ni cursos de control.
export async function getRanking(_req: Request, res: Response): Promise<void> {
  const days = rankingWindow(new Date(), PILOT_PERIOD);
  if (days.length === 0) {
    res.json([]);
    return;
  }

  const courses = await CourseModel.find({ group: "intervencion", active: { $ne: false } }).lean();
  const coursesForMetrics: CourseForMetrics[] = courses
    .filter((c) => typeof c.enrollment === "number")
    .map((c) => ({
      id: String(c._id),
      name: c.name,
      group: c.group as CourseGroup,
      enrollment: c.enrollment as number,
    }));

  if (coursesForMetrics.length === 0) {
    res.json([]);
    return;
  }

  const stats = await computeCourseStats(coursesForMetrics, days);

  const entries = coursesForMetrics
    .map((course) => {
      const stat = stats.get(course.id);
      if (!stat || stat.diasLectivos === 0) return null;
      return {
        courseId: course.id,
        courseName: course.name,
        pctPuntual: stat.pctPuntual,
        diasEvaluados: stat.diasLectivos,
      };
    })
    .filter((entry): entry is Omit<RankingEntryDto, "posicion"> => entry !== null)
    .sort(
      (a, b) =>
        b.pctPuntual - a.pctPuntual ||
        (a.courseName < b.courseName ? -1 : a.courseName > b.courseName ? 1 : 0)
    );

  // Ranking de competición: empates comparten posición, la siguiente salta (1,1,3).
  let posicion = 0;
  let previousPct: number | null = null;
  const result: RankingEntryDto[] = entries.map((entry, index) => {
    if (previousPct === null || entry.pctPuntual !== previousPct) {
      posicion = index + 1;
      previousPct = entry.pctPuntual;
    }
    return { ...entry, posicion };
  });

  res.json(result);
}
