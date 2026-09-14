"use client";

/** Vibración segura: no hace nada si el navegador no la soporta. */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignorar: algunos navegadores lanzan si el documento no está enfocado
  }
}

export const HAPTIC = {
  success: [30, 40, 30, 40, 80],
  ok: [25, 30, 25],
  fail: [60, 50, 60, 50, 120],
  tap: [12],
} as const satisfies Record<string, number[]>;
