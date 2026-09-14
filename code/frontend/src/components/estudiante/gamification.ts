import type { AttendanceRecord, AttendanceStatus } from "@/lib/api";

/** XP necesarios para subir un nivel. */
export const XP_PER_LEVEL = 30;

const TZ = "America/Bogota";

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const readableDateFmt = new Intl.DateTimeFormat("es-CO", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFmt = new Intl.DateTimeFormat("es-CO", {
  timeZone: TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** Día calendario de hoy en Bogotá, formato "YYYY-MM-DD". Nunca usar getDate(). */
export function bogotaToday(): string {
  return dayFmt.format(new Date());
}

/** Formatea un `day` ("YYYY-MM-DD") como fecha legible, ej. "martes, 9 de septiembre". */
export function formatBogotaDate(day: string): string {
  // Mediodía UTC evita que el corrimiento de zona horaria cambie el día calendario.
  const text = readableDateFmt.format(new Date(`${day}T12:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Formatea un instante ISO como hora local de Bogotá, ej. "6:42 a.m.". */
export function formatBogotaTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

function weekdayOfDay(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function addDaysToDay(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** Día hábil anterior: salta sábado y domingo (el lunes sigue al viernes). */
function prevBusinessDay(day: string): string {
  let cur = addDaysToDay(day, -1);
  while (weekdayOfDay(cur) === 0 || weekdayOfDay(cur) === 6) {
    cur = addDaysToDay(cur, -1);
  }
  return cur;
}

export interface StreakResult {
  /** Días hábiles consecutivos puntuales (temprano o a_tiempo) contando hacia atrás. */
  count: number;
  /** true si el registro más reciente fue tarde: la racha se apagó. */
  isOff: boolean;
}

/** Calcula la racha de puntualidad a partir del historial completo del estudiante. */
export function computeStreak(records: AttendanceRecord[]): StreakResult {
  if (records.length === 0) return { count: 0, isOff: false };

  const byDay = new Map<string, AttendanceStatus>();
  for (const r of records) byDay.set(r.day, r.status);

  const days = [...byDay.keys()].sort();
  const latestDay = days[days.length - 1];
  const latestStatus = byDay.get(latestDay);

  if (latestStatus === "tarde") {
    return { count: 0, isOff: true };
  }

  let count = 0;
  let expected: string | undefined = latestDay;
  while (expected !== undefined) {
    const status = byDay.get(expected);
    if (status === undefined || status === "tarde") break;
    count += 1;
    expected = prevBusinessDay(expected);
  }

  return { count, isOff: false };
}

export interface Badge {
  id: string;
  label: string;
  icon: string;
  unlocked: boolean;
}

/** Insignias desbloqueables, calculadas en cliente a partir del historial. */
export function computeBadges(records: AttendanceRecord[], xpTotal: number, streak: number): Badge[] {
  const tempranoCount = records.filter((r) => r.status === "temprano").length;

  return [
    { id: "primer-madrugador", label: "Primer madrugador", icon: "🌅", unlocked: tempranoCount >= 1 },
    { id: "racha-3", label: "Racha x3", icon: "🔥", unlocked: streak >= 3 },
    { id: "racha-5", label: "Racha x5", icon: "🔥🔥", unlocked: streak >= 5 },
    { id: "semana-perfecta", label: "Semana perfecta", icon: "🏆", unlocked: streak >= 5 },
    { id: "xp-100", label: "100 XP", icon: "💯", unlocked: xpTotal >= 100 },
    { id: "madrugador-serial", label: "Madrugador serial", icon: "🚀", unlocked: tempranoCount >= 10 },
  ];
}
