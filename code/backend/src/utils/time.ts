export { TZ } from "@/types/contracts.js"; // reexportar, no redefinir
import { TZ } from "@/types/contracts.js";

// Formatter cacheado a nivel de módulo: evita reconstruirlo en cada llamada.
const bogotaFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Descompone un instante UTC en día calendario y minutos desde medianoche,
 * ambos en hora de Bogotá. Solo usa Intl.DateTimeFormat, nunca los métodos locales de Date.
 */
export function toBogotaParts(d: Date): { day: string; minutes: number } {
  const parts = bogotaFormatter.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const day = `${get("year")}-${get("month")}-${get("day")}`;
  let hour = Number(get("hour"));
  const minute = Number(get("minute"));

  // Algunos runtimes devuelven "24" para medianoche con hourCycle h23.
  if (hour === 24) hour = 0;

  return { day, minutes: hour * 60 + minute };
}

/**
 * Rango UTC [start, end) correspondiente a un día calendario de Bogotá.
 * Bogotá es UTC-5 fijo (sin horario de verano), así que 00:00 Bogotá
 * es 05:00 UTC del mismo día calendario.
 */
export function bogotaDayRangeUtc(day: string): { start: Date; end: Date } {
  const [y, m, d] = day.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 5, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d + 1, 5, 0, 0));
  return { start, end };
}

/** Valida formato "YYYY-MM-DD" y que sea una fecha real (rechaza 2026-02-30). */
export function isDayString(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return false;

  const [, yStr, mStr, dStr] = match;
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);

  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Aritmética de calendario sobre un día "YYYY-MM-DD", vía Date.UTC. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** 0=domingo..6=sábado, del día calendario (sin componente horaria). */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Días "YYYY-MM-DD" entre from y to, ambos inclusive. [] si from > to. */
export function daysInRange(from: string, to: string): string[] {
  if (from > to) return [];
  const result: string[] = [];
  let current = from;
  while (current <= to) {
    result.push(current);
    current = addDays(current, 1);
  }
  return result;
}
