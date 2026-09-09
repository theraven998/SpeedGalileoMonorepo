import type { AttendanceStatus } from "@/models/AttendanceRecord.js";

// Reglas del piloto: portería cierra 7:30.
// < 7:20 -> 3 pts | 7:20-7:30 -> 2 pts | > 7:30 -> 0 pts
const EARLY_CUTOFF = { hour: 7, minute: 20 };
const LATE_CUTOFF = { hour: 7, minute: 30 };

export function computeAttendance(scannedAt: Date): { status: AttendanceStatus; points: number } {
  const minutes = scannedAt.getHours() * 60 + scannedAt.getMinutes();
  const earlyLimit = EARLY_CUTOFF.hour * 60 + EARLY_CUTOFF.minute;
  const lateLimit = LATE_CUTOFF.hour * 60 + LATE_CUTOFF.minute;

  if (minutes < earlyLimit) return { status: "temprano", points: 3 };
  if (minutes <= lateLimit) return { status: "a_tiempo", points: 2 };
  return { status: "tarde", points: 0 };
}
