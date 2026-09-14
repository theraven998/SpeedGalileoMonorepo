"use client";

import { motion, type Transition, type TargetAndTransition } from "motion/react";
import { useReducedMotion } from "./useReducedMotion";

export type MascotWho = "gali" | "diego" | "duo";
export type MascotMood = "idle" | "happy" | "cheer" | "sad" | "shocked" | "running";

const SRC: Record<MascotWho, string> = {
  gali: "/personajes/galileo-t.png",
  diego: "/personajes/diego-t.png",
  duo: "/personajes/duo-t.png",
};

const ALT: Record<MascotWho, string> = {
  gali: "Gali, la mascota de Galileo, cohete verde",
  diego: "Diego, la mascota compañera del colegio",
  duo: "Mascota de SpeedGalileo",
};

interface MoodConfig {
  animate: TargetAndTransition;
  transition: Transition;
  /** Versión reducida para prefers-reduced-motion: sin saltos ni sacudidas. */
  reducedAnimate?: TargetAndTransition;
}

const MOODS: Record<MascotMood, MoodConfig> = {
  idle: {
    animate: { y: [0, -10, 0], rotate: [0, -2, 0, 2, 0] },
    transition: { duration: 3.4, repeat: Infinity, ease: "easeInOut" },
  },
  happy: {
    animate: {
      y: [0, -22, 0, -8, 0],
      scaleX: [1, 1.08, 0.94, 1.04, 1],
      scaleY: [1, 0.92, 1.1, 0.96, 1],
    },
    transition: { duration: 0.9, repeat: Infinity, repeatDelay: 0.2, ease: "easeOut" },
  },
  cheer: {
    animate: {
      y: [0, -36, 0],
      rotate: [0, -14, 14, -6, 0],
      scale: [1, 1.12, 1],
    },
    transition: { duration: 1, repeat: Infinity, repeatDelay: 0.25, ease: "easeInOut" },
  },
  sad: {
    animate: {
      y: [0, 6, 0],
      rotate: [-5, -3, -5],
      filter: ["grayscale(0.55) brightness(0.96)"],
    },
    transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
    reducedAnimate: { filter: "grayscale(0.55) brightness(0.96)", rotate: -4 },
  },
  shocked: {
    animate: {
      x: [0, -7, 7, -7, 7, 0],
      rotate: [0, -3, 3, -3, 3, 0],
    },
    transition: { duration: 0.5, repeat: Infinity, repeatDelay: 0.5 },
  },
  running: {
    animate: {
      x: [0, -16, 0, 16, 0],
      y: [0, -9, 0, -9, 0],
      rotate: [0, -5, 0, 5, 0],
    },
    transition: { duration: 0.85, repeat: Infinity, ease: "easeInOut" },
  },
};

function RainCloud({ animated }: { animated: boolean }) {
  const drops = [0, 1, 2];
  return (
    <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2" aria-hidden>
      <svg width="64" height="30" viewBox="0 0 64 30" fill="none">
        <ellipse cx="24" cy="16" rx="16" ry="11" fill="#b9c6d4" />
        <ellipse cx="40" cy="13" rx="13" ry="10" fill="#a9b8c9" />
        <ellipse cx="32" cy="19" rx="20" ry="9" fill="#c3cfdb" />
      </svg>
      <div className="relative -mt-1 flex justify-center gap-2.5">
        {drops.map((i) =>
          animated ? (
            <motion.span
              key={i}
              className="block h-2 w-1 rounded-full bg-azul"
              initial={{ y: -2, opacity: 0 }}
              animate={{ y: 14, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.28, ease: "easeIn" }}
            />
          ) : (
            <span key={i} className="block h-2 w-1 rounded-full bg-azul opacity-70" />
          )
        )}
      </div>
    </div>
  );
}

export interface MascotProps {
  who: MascotWho;
  mood?: MascotMood;
  size?: number;
  className?: string;
}

export function Mascot({ who, mood = "idle", size = 140, className }: MascotProps) {
  const reducedMotion = useReducedMotion();
  const config = MOODS[mood];
  const animate = reducedMotion ? (config.reducedAnimate ?? {}) : config.animate;
  const transition = reducedMotion ? { duration: 0.3 } : config.transition;

  return (
    <div className={`relative inline-block ${className ?? ""}`} style={{ width: size, height: size }}>
      {mood === "sad" && <RainCloud animated={!reducedMotion} />}
      <motion.img
        src={SRC[who]}
        alt={ALT[who]}
        animate={animate}
        transition={transition}
        style={{ width: size, height: size, objectFit: "contain" }}
        draggable={false}
      />
    </div>
  );
}
