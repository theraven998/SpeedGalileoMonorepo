"use client";

import { useMemo, useState } from "react";
import { CountUp, Mascot, playTap } from "@/components/fx";

const MIN_MINUTES = 6 * 60 + 30; // 06:30
const MAX_MINUTES = 8 * 60; // 08:00
const EARLY_CUTOFF = 7 * 60 + 20; // 07:20
const LATE_CUTOFF = 7 * 60 + 30; // 07:30

type Status = "temprano" | "a_tiempo" | "tarde";

const STATUS_COPY: Record<Status, { label: string; points: number; mood: "cheer" | "happy" | "sad"; color: string }> = {
  temprano: { label: "¡Perfecto, muy temprano!", points: 3, mood: "cheer", color: "text-primary" },
  a_tiempo: { label: "Casi casi, pero entras a tiempo", points: 2, mood: "happy", color: "text-amarillo-oscuro" },
  tarde: { label: "Portería cerrada, llegaste tarde", points: 0, mood: "sad", color: "text-rojo-oscuro" },
};

function statusFor(minutes: number): Status {
  if (minutes < EARLY_CUTOFF) return "temprano";
  if (minutes <= LATE_CUTOFF) return "a_tiempo";
  return "tarde";
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Mini demo: mueve el slider de hora y ve puntos + mood de la mascota en vivo. */
export function ArrivalDemo() {
  const [minutes, setMinutes] = useState(400); // 06:40
  const status = useMemo(() => statusFor(minutes), [minutes]);
  const copy = STATUS_COPY[status];

  return (
    <div className="card-hard mx-auto mt-8 max-w-md p-6 text-center">
      <h3 className="text-lg font-extrabold text-foreground">¿A qué hora llegas?</h3>
      <div className="mt-3 flex justify-center">
        <Mascot who="duo" mood={copy.mood} size={104} />
      </div>
      <div className="mt-2 text-3xl font-black text-foreground">{formatTime(minutes)}</div>
      <input
        type="range"
        min={MIN_MINUTES}
        max={MAX_MINUTES}
        step={1}
        value={minutes}
        onChange={(e) => setMinutes(Number(e.target.value))}
        onPointerUp={() => playTap()}
        className="mt-4 w-full accent-primary"
        aria-label="Hora simulada de llegada"
      />
      <div className="mt-1 flex justify-between text-xs font-bold text-foreground-muted">
        <span>6:30</span>
        <span>8:00</span>
      </div>
      <div className="mt-4">
        <CountUp value={copy.points} suffix=" pts" className={`text-4xl font-black ${copy.color}`} />
      </div>
      <p className="mt-1 text-sm font-bold text-foreground-muted">{copy.label}</p>
    </div>
  );
}
