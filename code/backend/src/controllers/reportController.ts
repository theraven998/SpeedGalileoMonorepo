import type { Request, Response } from "express";
import { CourseModel } from "@/models/Course.js";
import { computeCourseStats, type CourseForMetrics } from "@/services/metrics.js";
import { lectivoDaysInRange } from "@/utils/holidays.js";
import { isDayString } from "@/utils/time.js";
import type { CourseSummaryDto, CourseGroup } from "@/types/contracts.js";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function groupOrder(group: CourseGroup): number {
  return group === "intervencion" ? 0 : 1;
}

// Coordinación: base del informe a rectoría. Incluye intervención y control.
export async function getSummary(req: Request, res: Response): Promise<void> {
  const { from, to } = req.query;

  if (!isDayString(from) || !isDayString(to) || from > to) {
    res.status(400).json({
      error: "from y to son obligatorios con formato YYYY-MM-DD, y from <= to",
    });
    return;
  }

  const days = lectivoDaysInRange(from, to);

  const courses = await CourseModel.find({ active: { $ne: false } }).lean();
  // Cursos sin group o sin enrollment numérico (pre-migración) se omiten.
  const coursesForMetrics: CourseForMetrics[] = courses
    .filter(
      (c) => (c.group === "intervencion" || c.group === "control") && typeof c.enrollment === "number"
    )
    .map((c) => ({
      id: String(c._id),
      name: c.name,
      group: c.group as CourseGroup,
      enrollment: c.enrollment as number,
    }));

  const stats = await computeCourseStats(coursesForMetrics, days);

  const result: CourseSummaryDto[] = coursesForMetrics
    .map((course) => {
      const stat = stats.get(course.id) ?? {
        diasLectivos: 0,
        puntuales: 0,
        tarde: 0,
        ausentes: 0,
        justificados: 0,
        denominador: 0,
        minutosPerdidos: 0,
        pctPuntual: 0,
      };
      return {
        courseId: course.id,
        courseName: course.name,
        group: course.group,
        enrollment: course.enrollment,
        diasLectivos: stat.diasLectivos,
        puntuales: stat.puntuales,
        tarde: stat.tarde,
        ausentes: stat.ausentes,
        justificados: stat.justificados,
        pctPuntual: stat.pctPuntual,
        minutosPerdidos: stat.minutosPerdidos,
        minutosPerdidosPorEstudiante:
          course.enrollment > 0 ? round1(stat.minutosPerdidos / course.enrollment) : 0,
      };
    })
    .sort(
      (a, b) =>
        groupOrder(a.group) - groupOrder(b.group) ||
        (a.courseName < b.courseName ? -1 : a.courseName > b.courseName ? 1 : 0)
    );

  res.json(result);
}
