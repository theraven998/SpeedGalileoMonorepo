/**
 * Hora de Bogotá calculada con Intl (NUNCA con Date#getHours, que usa la
 * zona horaria del dispositivo). Solo informativo en portería: la
 * clasificación real de temprano/a_tiempo/tarde la hace el backend.
 */

export const EARLY_CUTOFF_MIN = 7 * 60 + 20; // 07:20
export const LATE_CUTOFF_MIN = 7 * 60 + 30; // 07:30

const FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function bogotaParts(date: Date): { hour: number; minute: number } {
  const parts = FORMATTER.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour, minute };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export interface BogotaNow {
  hour: number;
  minute: number;
  minutesOfDay: number;
  label: string;
}

export function getBogotaNow(): BogotaNow {
  const { hour, minute } = bogotaParts(new Date());
  return { hour, minute, minutesOfDay: hour * 60 + minute, label: `${pad(hour)}:${pad(minute)}` };
}

/** Formatea un ISO string a "HH:mm" en hora de Bogotá. */
export function formatBogotaTime(iso: string): string {
  const { hour, minute } = bogotaParts(new Date(iso));
  return `${pad(hour)}:${pad(minute)}`;
}
