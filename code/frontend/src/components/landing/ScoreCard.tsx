"use client";

import { useRef, useState } from "react";
import { HAPTIC, playCoin, playDing, playSadTrombone, starBurst, useReducedMotion, vibrate } from "@/components/fx";

export type ScoreCardKind = "temprano" | "a_tiempo" | "tarde";

const TONE: Record<ScoreCardKind, string> = {
  temprano: "score-tile--g",
  a_tiempo: "score-tile--y",
  tarde: "score-tile--r",
};

export interface ScoreCardProps {
  kind: ScoreCardKind;
  range: string;
  points: number;
  caption: string;
}

/**
 * Tarjeta interactiva de la escala de puntos. Temprano: jelly + confeti de
 * estrellas + moneda. A tiempo: pop + ding. Tarde: se "moja" e inclina + trombón triste.
 */
export function ScoreCard({ kind, range, points, caption }: ScoreCardProps) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const [effect, setEffect] = useState<"idle" | "jelly" | "pop" | "wet">("idle");

  function trigger() {
    if (busyRef.current) return;
    busyRef.current = true;

    if (kind === "temprano") {
      setEffect("jelly");
      playCoin();
      vibrate(HAPTIC.ok);
      if (!reducedMotion && ref.current) {
        const r = ref.current.getBoundingClientRect();
        starBurst(r.left + r.width / 2, r.top + r.height / 3);
      }
    } else if (kind === "a_tiempo") {
      setEffect("pop");
      playDing();
      vibrate(HAPTIC.tap);
    } else {
      setEffect("wet");
      playSadTrombone();
      vibrate(HAPTIC.fail);
    }

    window.setTimeout(() => {
      setEffect("idle");
      busyRef.current = false;
    }, 700);
  }

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onMouseEnter={trigger}
      onFocus={trigger}
      onClick={trigger}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          trigger();
        }
      }}
      className={`score-tile ${TONE[kind]} relative cursor-pointer select-none transition-transform duration-150 ${
        effect === "jelly" ? "animate-jelly" : ""
      } ${effect === "pop" ? "animate-pop" : ""} ${effect === "wet" && !reducedMotion ? "-rotate-2" : ""}`}
    >
      {effect === "wet" && !reducedMotion && (
        <div className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 text-2xl" aria-hidden>
          🌧️
        </div>
      )}
      <div className="text-sm font-extrabold opacity-90">{range}</div>
      <div className="my-1 text-[52px] font-black leading-none">{points}</div>
      <div className="text-xs font-extrabold uppercase tracking-widest opacity-95">{caption}</div>
    </div>
  );
}
