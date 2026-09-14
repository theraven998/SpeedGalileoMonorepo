import { Types } from "mongoose";
import { AttendanceRecordModel } from "@/models/AttendanceRecord.js";
import type { CourseGroup } from "@/types/contracts.js";

export interface CourseForMetrics {
  id: string;
  name: string;
  group: CourseGroup;
  enrollment: number;
}

export interface CoursePeriodStats {
  diasLectivos: number;
  puntuales: number;
  tarde: number;
  ausentes: number;
  justificados: number;
  denominador: number;
  minutosPerdidos: number;
  /** Redondeado a 2 decimales. 0 si la suma de denominadores es 0. */
  pctPuntual: number;
}

/** Conteos crudos de un curso en un día, ya sin distinguir justificado/no. */
interface DayAggregate {
  justificados: number;
  registros: number;
  puntuales: number;
  tarde: number;
  minutosPerdidos: number;
}

const EMPTY_DAY: DayAggregate = {
  justificados: 0,
  registros: 0,
  puntuales: 0,
  tarde: 0,
  minutosPerdidos: 0,
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Agrega asistencia por curso y día lectivo aplicando la semántica exacta
 * del dominio (00-dominio.md §5, §8):
 *  - justificados: registros con justified = true.
 *  - registros: no justificados (justified !== true).
 *  - puntuales: no justificados con status temprano | a_tiempo.
 *  - tarde: no justificados con status tarde.
 *  - minutosPerdidos: suma de minutesLate de los "tarde" no justificados.
 *  - denominadorDia = enrollment - justificadosDia; si <= 0, el día se
 *    excluye por completo (no suma a ninguna métrica ni a diasLectivos).
 *  - ausentesDia = max(0, enrollment - registrosDia - justificadosDia).
 *
 * `days` debe venir ya filtrado a días lectivos (lectivoDaysInRange). Los
 * días de `days` sin ningún registro en Mongo cuentan igual: todo el curso
 * ausente ese día.
 */
export async function computeCourseStats(
  courses: CourseForMetrics[],
  days: string[]
): Promise<Map<string, CoursePeriodStats>> {
  const result = new Map<string, CoursePeriodStats>();
  if (courses.length === 0 || days.length === 0) return result;

  const objectIds = courses.map((c) => new Types.ObjectId(c.id));

  const rows = await AttendanceRecordModel.aggregate<{
    _id: { course: Types.ObjectId; day: string };
    justificados: number;
    registros: number;
    puntuales: number;
    tarde: number;
    minutosPerdidos: number;
  }>([
    { $match: { course: { $in: objectIds }, day: { $in: days } } },
    {
      $group: {
        _id: { course: "$course", day: "$day" },
        justificados: { $sum: { $cond: [{ $eq: ["$justified", true] }, 1, 0] } },
        registros: { $sum: { $cond: [{ $ne: ["$justified", true] }, 1, 0] } },
        puntuales: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$justified", true] },
                  { $in: ["$status", ["temprano", "a_tiempo"]] },
                ],
              },
              1,
              0,
            ],
          },
        },
        tarde: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ["$justified", true] }, { $eq: ["$status", "tarde"] }] },
              1,
              0,
            ],
          },
        },
        minutosPerdidos: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ["$justified", true] }, { $eq: ["$status", "tarde"] }] },
              "$minutesLate",
              0,
            ],
          },
        },
      },
    },
  ]);

  const byCourseDay = new Map<string, DayAggregate>();
  for (const row of rows) {
    const key = `${String(row._id.course)}|${row._id.day}`;
    byCourseDay.set(key, {
      justificados: row.justificados,
      registros: row.registros,
      puntuales: row.puntuales,
      tarde: row.tarde,
      minutosPerdidos: row.minutosPerdidos,
    });
  }

  for (const course of courses) {
    let diasLectivos = 0;
    let puntuales = 0;
    let tarde = 0;
    let ausentes = 0;
    let justificados = 0;
    let denominador = 0;
    let minutosPerdidos = 0;

    for (const day of days) {
      const agg = byCourseDay.get(`${course.id}|${day}`) ?? EMPTY_DAY;
      const denominadorDia = course.enrollment - agg.justificados;
      if (denominadorDia <= 0) continue; // día excluido de todo, ver §8

      diasLectivos += 1;
      puntuales += agg.puntuales;
      tarde += agg.tarde;
      justificados += agg.justificados;
      minutosPerdidos += agg.minutosPerdidos;
      denominador += denominadorDia;
      ausentes += Math.max(0, course.enrollment - agg.registros - agg.justificados);
    }

    const pctPuntual = denominador > 0 ? round2(puntuales / denominador) : 0;

    result.set(course.id, {
      diasLectivos,
      puntuales,
      tarde,
      ausentes,
      justificados,
      denominador,
      minutosPerdidos,
      pctPuntual,
    });
  }

  return result;
}
