import "dotenv/config";
import { isDayString } from "@/utils/time.js";

export interface Period {
  from: string;
  to: string;
}

function resolvePilotPeriod(): Period {
  const from = process.env.PILOT_START ?? "2026-09-14";
  const to = process.env.PILOT_END ?? "2026-09-18";

  if (!isDayString(from)) throw new Error(`PILOT_START inválido: "${from}"`);
  if (!isDayString(to)) throw new Error(`PILOT_END inválido: "${to}"`);

  return { from, to };
}

export const PILOT_PERIOD: Period = resolvePilotPeriod();

// TODO: fechas de línea base pendientes de confirmar
export const BASELINE_PERIOD: Period | null = null;
