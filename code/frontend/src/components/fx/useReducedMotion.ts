"use client";

import { useReducedMotion as useMotionReducedMotion } from "motion/react";

/**
 * Wrapper sobre el hook de motion: normaliza `null` (SSR / sin preferencia
 * aún resuelta) a `false` para que el consumidor no tenga que lidiar con
 * tres estados.
 */
export function useReducedMotion(): boolean {
  return Boolean(useMotionReducedMotion());
}
