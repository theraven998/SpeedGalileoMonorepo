import { daysInRange, weekdayOf } from "@/utils/time.js";

// Festivos oficiales Colombia 2026 (ya trasladados por Ley Emiliani donde aplica).
// TODO: agregar festivos 2027 antes de usar el sistema el próximo año
export const HOLIDAYS: readonly string[] = [
  "2026-01-01",
  "2026-01-12",
  "2026-03-23",
  "2026-04-02",
  "2026-04-03",
  "2026-05-01",
  "2026-05-18",
  "2026-06-08",
  "2026-06-15",
  "2026-06-29",
  "2026-07-20",
  "2026-08-07",
  "2026-08-17",
  "2026-10-12",
  "2026-11-02",
  "2026-11-16",
  "2026-12-08",
  "2026-12-25",
];

// TODO: confirmar con el colegio izadas, salidas pedagógicas y días sin clase dentro del piloto (2026-09-14 a 2026-09-18)
export const SPECIAL_NO_CLASS_DAYS: readonly string[] = [];

/**
 * Un día es lectivo si: es lunes a viernes en Bogotá, no es festivo ni
 * jornada especial sin clase, y (si se pasa range) cae dentro del rango.
 */
export function isLectivo(day: string, range?: { from: string; to: string }): boolean {
  const weekday = weekdayOf(day);
  if (weekday < 1 || weekday > 5) return false;
  if (HOLIDAYS.includes(day)) return false;
  if (SPECIAL_NO_CLASS_DAYS.includes(day)) return false;
  if (range && (day < range.from || day > range.to)) return false;
  return true;
}

/** Días lectivos entre from y to, ambos inclusive. */
export function lectivoDaysInRange(from: string, to: string): string[] {
  return daysInRange(from, to).filter((day) => isLectivo(day, { from, to }));
}
