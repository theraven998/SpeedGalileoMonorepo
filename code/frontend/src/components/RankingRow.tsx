"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { RankingEntry } from "@/lib/api";
import { CountUp, playTap, useReducedMotion } from "@/components/fx";

const MEDALS = ["🥇", "🥈", "🥉"];
const AVATAR_TONES = ["bg-azul", "bg-morado", "bg-naranja"];

/** Iniciales del curso para el avatar. Compartido con el podio del ranking. */
export function courseInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }
  return (name.slice(0, 3) || "?").toUpperCase();
}

export interface RankingRowProps {
  entry: RankingEntry;
  position: number;
  size?: "md" | "lg";
}

export function RankingRow({ entry, position, size = "md" }: RankingRowProps) {
  const reducedMotion = useReducedMotion();
  const [tapped, setTapped] = useState(false);
  const medalIdx = entry.posicion - 1;
  const isFirst = medalIdx === 0;
  const pct = Math.max(0, Math.min(100, Math.round(entry.pctPuntual * 100)));

  function handleTap() {
    playTap();
    if (!reducedMotion) setTapped(true);
  }

  return (
    <motion.li
      onClick={handleTap}
      onAnimationEnd={() => setTapped(false)}
      whileHover={reducedMotion ? undefined : { y: -3 }}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 ${
        isFirst ? "border-amarillo bg-[#fffaeb] animate-pulse-glow" : "border-border bg-surface"
      } ${size === "lg" ? "sm:gap-4 sm:px-5 sm:py-4" : ""} ${tapped ? "animate-wiggle" : ""}`}
    >
      <motion.span
        initial={reducedMotion ? false : { scale: 0, rotate: -25, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.6, duration: 0.5 }}
        className="w-7 shrink-0 text-center text-xl sm:text-2xl"
        aria-hidden
      >
        {MEDALS[medalIdx] ?? "🎯"}
      </motion.span>
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${AVATAR_TONES[position % AVATAR_TONES.length]}`}
      >
        {courseInitials(entry.courseName)}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[17px] font-extrabold text-foreground">{entry.courseName}</b>
        <small className="block text-xs font-bold text-foreground-muted">
          {entry.diasEvaluados} {entry.diasEvaluados === 1 ? "día" : "días"}
        </small>
        <span className="prog-bar mt-1.5 block h-2 max-w-[230px] overflow-hidden rounded-full bg-border">
          <motion.i
            className={`block h-full rounded-full bg-primary ${isFirst ? "animate-shine" : ""}`}
            initial={reducedMotion ? false : { width: "0%" }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", bounce: 0.25, duration: 1 }}
          />
        </span>
      </span>
      <span
        className={`whitespace-nowrap text-lg font-black sm:text-xl ${isFirst ? "text-amarillo-oscuro" : "text-primary"}`}
      >
        <CountUp value={pct} duration={1.1} suffix="%" />
      </span>
    </motion.li>
  );
}
