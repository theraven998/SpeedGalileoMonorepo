"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "./useReducedMotion";
import { Mascot } from "./Mascot";
import { XpBurst } from "./XpBurst";
import { playOutcome, type OutcomeStatus } from "./sound";
import { vibrate, HAPTIC } from "./haptics";
import { cannons, starBurst } from "./confetti";

const EMPATHETIC_LINES = ["Mañana lo logras 💪", "¡La revancha es mañana!", "Gali cree en ti"];

const HAPTIC_BY_STATUS: Record<OutcomeStatus, readonly number[]> = {
  temprano: HAPTIC.success,
  a_tiempo: HAPTIC.ok,
  tarde: HAPTIC.fail,
  duplicado: HAPTIC.tap,
};

export interface OutcomeOverlayProps {
  status: OutcomeStatus;
  name?: string;
  points: number;
  minutesLate?: number;
  onDone: () => void;
  /** Cierre automático en ms. Default 2600. */
  autoCloseMs?: number;
}

function SunRays() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <div
        className="animate-spin-slow h-[220%] w-[220%] opacity-25"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, #ffffff 0deg 6deg, transparent 6deg 22deg)",
        }}
      />
    </div>
  );
}

function Cracks() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 400 800"
      preserveAspectRatio="none"
      aria-hidden
    >
      {[
        "M40,0 L70,140 L30,230 L90,360",
        "M380,60 L320,190 L360,300 L280,420",
        "M180,0 L210,120 L150,260 L200,420 L140,560",
      ].map((d, i) => (
        <motion.path
          key={d}
          d={d}
          stroke="#1e293b"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          opacity={0.55}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.15 + i * 0.1, ease: "easeOut" }}
        />
      ))}
    </svg>
  );
}

const COPY: Record<OutcomeStatus, { title: string; subtitle: string; bg: string; mascotWho: "gali" | "diego" | "duo"; mascotMood: "cheer" | "happy" | "sad" | "shocked" }> = {
  temprano: {
    title: "¡MADRUGADOR LEGENDARIO!",
    subtitle: "Llegaste antes que nadie",
    bg: "#58cc02",
    mascotWho: "gali",
    mascotMood: "cheer",
  },
  a_tiempo: {
    title: "¡JUSTO A TIEMPO!",
    subtitle: "Así se hace",
    bg: "#1cb0f6",
    mascotWho: "diego",
    mascotMood: "happy",
  },
  tarde: {
    title: "¡Ay no… llegaste tarde!",
    subtitle: "",
    bg: "#64748b",
    mascotWho: "duo",
    mascotMood: "sad",
  },
  duplicado: {
    title: "Ya estaba registrado hoy 👀",
    subtitle: "No pasa nada, no se duplicó tu registro",
    bg: "#1cb0f6",
    mascotWho: "duo",
    mascotMood: "shocked",
  },
};

export function OutcomeOverlay({ status, name, points, minutesLate = 0, onDone, autoCloseMs = 2600 }: OutcomeOverlayProps) {
  const reducedMotion = useReducedMotion();
  const copy = COPY[status];
  const [empathLine] = useState(() => EMPATHETIC_LINES[Math.floor(Math.random() * EMPATHETIC_LINES.length)]);
  const closedRef = useRef(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  function close() {
    if (closedRef.current) return;
    closedRef.current = true;
    onDoneRef.current();
  }

  useEffect(() => {
    playOutcome(status);
    vibrate([...HAPTIC_BY_STATUS[status]]);

    if (!reducedMotion) {
      if (status === "temprano") {
        cannons();
        setTimeout(() => starBurst(0.5, 0.4), 150);
      } else if (status === "a_tiempo") {
        starBurst(0.5, 0.4);
      }
    }

    const timer = setTimeout(close, autoCloseMs);
    return () => clearTimeout(timer);
  }, [status, autoCloseMs, reducedMotion]);

  const isPunish = status === "tarde";
  const isNeutral = status === "duplicado";

  return (
    <motion.div
      role="status"
      aria-live="polite"
      onClick={close}
      className="fixed inset-0 z-[999] flex cursor-pointer items-center justify-center overflow-hidden px-6 text-center"
      style={{ backgroundColor: copy.bg }}
      initial={{ opacity: 0 }}
      animate={
        reducedMotion
          ? { opacity: 1 }
          : isPunish
            ? { opacity: 1, x: [0, -14, 12, -10, 8, -4, 0], backgroundColor: "#334155" }
            : { opacity: 1 }
      }
      transition={
        isPunish
          ? { opacity: { duration: 0.2 }, x: { duration: 0.5, ease: "easeInOut" }, backgroundColor: { duration: 1.4 } }
          : { duration: 0.2 }
      }
    >
      {status === "temprano" && !reducedMotion && <SunRays />}
      {isPunish && !reducedMotion && <Cracks />}

      {!reducedMotion && status === "temprano" && (
        <motion.div
          className="pointer-events-none absolute inset-0 bg-white"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      )}

      <div className="relative flex flex-col items-center gap-4">
        <Mascot who={copy.mascotWho} mood={copy.mascotMood} size={150} />

        <motion.h2
          className={`animate-shine text-3xl font-black tracking-tight sm:text-4xl ${
            isPunish ? "text-white" : isNeutral ? "text-white" : "text-white drop-shadow"
          }`}
          initial={
            reducedMotion
              ? { opacity: 0 }
              : status === "temprano"
                ? { scale: 3, opacity: 0, rotate: -8 }
                : isPunish
                  ? { y: -260, opacity: 0 }
                  : { opacity: 0, y: -10 }
          }
          animate={
            reducedMotion
              ? { opacity: 1 }
              : status === "temprano"
                ? { scale: 1, opacity: 1, rotate: -4 }
                : isPunish
                  ? { y: 0, opacity: 1 }
                  : { opacity: 1, y: 0 }
          }
          transition={
            status === "temprano"
              ? { type: "spring", bounce: 0.55, duration: 0.7 }
              : isPunish
                ? { type: "spring", bounce: 0.5, duration: 0.8 }
                : { duration: 0.4 }
          }
        >
          {copy.title}
        </motion.h2>

        {name && <p className="text-base font-bold text-white/90">{name}</p>}

        {status === "a_tiempo" && (
          <svg width="84" height="84" viewBox="0 0 100 100" fill="none" aria-hidden>
            <motion.path
              d="M20,55 L42,78 L82,25"
              stroke="#fff"
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.15, ease: "easeInOut" }}
            />
          </svg>
        )}

        {!isPunish && !isNeutral && (
          <XpBurst points={points} />
        )}

        {isPunish && (
          <>
            <motion.div
              className="text-3xl font-black text-white"
              initial={{ scale: 1, opacity: 1, y: 0 }}
              animate={reducedMotion ? {} : { scale: [1, 1.15, 0.7], y: [0, -6, 30], opacity: [1, 1, 0.3] }}
              transition={{ duration: 0.9, delay: 0.4, ease: "easeIn" }}
            >
              {points} XP
            </motion.div>

            {minutesLate > 0 && (
              <span className="badge-status badge-status--r bg-white/15 text-white">
                −{minutesLate} min de clase
              </span>
            )}

            <p className="text-sm font-bold text-white/85">{empathLine}</p>
          </>
        )}

        {isNeutral && copy.subtitle && <p className="text-sm font-bold text-white/85">{copy.subtitle}</p>}
      </div>
    </motion.div>
  );
}
