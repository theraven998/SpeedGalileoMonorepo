"use client";

import { CountUp } from "@/components/fx";
import { XP_PER_LEVEL } from "./gamification";

export interface ProgressHeaderProps {
  xpTotal: number;
  level: number;
  xpInLevel: number;
}

/** Cabecera de progreso: XP total animado + nivel + barra hacia el siguiente. */
export function ProgressHeader({ xpTotal, level, xpInLevel }: ProgressHeaderProps) {
  const pct = Math.round((xpInLevel / XP_PER_LEVEL) * 100);
  const missing = XP_PER_LEVEL - xpInLevel;

  return (
    <section className="card-hard mx-auto w-full max-w-sm p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-foreground-muted">Nivel {level}</p>
          <p className="text-3xl font-black text-foreground">
            <CountUp value={xpTotal} suffix=" XP" />
          </p>
        </div>
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-black text-white"
          style={{ boxShadow: "0 4px 0 var(--verde-oscuro)" }}
          aria-hidden
        >
          {level}
        </span>
      </div>
      <div className="prog-bar mt-3 h-3 overflow-hidden rounded-full bg-border">
        <i className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-right text-[11px] font-bold text-foreground-muted">
        {missing} XP para el nivel {level + 1}
      </p>
    </section>
  );
}
