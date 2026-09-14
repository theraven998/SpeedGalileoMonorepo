import { EARLY_CUTOFF_MIN, LATE_CUTOFF_MIN, CLASS_START_MIN, type AttendanceStatus } from "@/types/contracts.js";
import { toBogotaParts } from "@/utils/time.js";

// Reglas del piloto: portería cierra 7:30.
// < 7:20 -> 3 pts | 7:20-7:30 -> 2 pts | > 7:30 -> 0 pts
export const EARLY_CUTOFF = EARLY_CUTOFF_MIN;
export const LATE_CUTOFF = LATE_CUTOFF_MIN;

export function classifyMinutes(minutes: number): { status: AttendanceStatus; points: number; minutesLate: number } {
  if (minutes < EARLY_CUTOFF) return { status: "temprano", points: 3, minutesLate: 0 };
  if (minutes <= LATE_CUTOFF) return { status: "a_tiempo", points: 2, minutesLate: 0 };
  return { status: "tarde", points: 0, minutesLate: Math.max(0, minutes - CLASS_START_MIN) };
}

export function computeAttendance(scannedAt: Date): { day: string; status: AttendanceStatus; points: number; minutesLate: number } {
  const { day, minutes } = toBogotaParts(scannedAt);
  return { day, ...classifyMinutes(minutes) };
}
