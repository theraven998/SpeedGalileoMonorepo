"use client";

import { useEffect, useState } from "react";
import { useMotionValue, useSpring, useMotionValueEvent } from "motion/react";
import { useReducedMotion } from "./useReducedMotion";

export interface CountUpProps {
  value: number;
  /** Duración aproximada en segundos. */
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Formateador propio; si se da, ignora decimals/prefix/suffix. */
  format?: (n: number) => string;
  className?: string;
}

/** Número animado con spring. Con reduced motion muestra el valor final directo. */
export function CountUp({ value, duration = 1, decimals = 0, prefix = "", suffix = "", format, className }: CountUpProps) {
  const reducedMotion = useReducedMotion();
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { duration, bounce: 0.15 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useMotionValueEvent(spring, "change", (latest) => {
    setDisplay(latest);
  });

  const shown = reducedMotion ? value : display;
  const text = format ? format(shown) : `${prefix}${shown.toFixed(decimals)}${suffix}`;

  return <span className={className}>{text}</span>;
}
