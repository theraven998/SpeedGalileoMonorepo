"use client";

import confetti from "canvas-confetti";

/** Paleta SpeedGalileo para todos los efectos de confeti. */
const PALETTE = ["#58cc02", "#1cb0f6", "#ffc800", "#ff9600", "#ce82ff"];

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function safe(fn: () => void): void {
  if (prefersReducedMotion()) return;
  if (typeof window === "undefined") return;
  try {
    fn();
  } catch {
    // canvas-confetti no disponible (SSR, entorno restringido, etc.)
  }
}

/** Dos cañones disparando desde las esquinas inferiores hacia el centro. */
export function cannons(): void {
  safe(() => {
    const shared: confetti.Options = { colors: PALETTE, ticks: 220, gravity: 0.9 };
    void confetti({ ...shared, particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 1 } });
    void confetti({ ...shared, particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 1 } });
  });
}

/** Ráfagas repetidas tipo fuegos artificiales durante `durationMs`. */
export function fireworks(durationMs = 2000): void {
  safe(() => {
    const end = Date.now() + durationMs;
    const frame = () => {
      void confetti({
        particleCount: 3,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.6 },
        colors: PALETTE,
        startVelocity: 45,
        ticks: 200,
      });
      void confetti({
        particleCount: 3,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.6 },
        colors: PALETTE,
        startVelocity: 45,
        ticks: 200,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  });
}

/** Lluvia dorada cayendo lentamente desde arriba, borde a borde. */
export function goldenRain(): void {
  safe(() => {
    void confetti({
      particleCount: 90,
      startVelocity: 8,
      gravity: 0.4,
      ticks: 300,
      spread: 100,
      origin: { x: 0.5, y: -0.1 },
      colors: ["#ffc800", "#e6a800", "#ff9600"],
      shapes: ["circle", "square"],
      scalar: 1.1,
    });
  });
}

/** Estallido de estrellas en un punto concreto de la pantalla (px o 0..1). */
export function starBurst(x: number, y: number): void {
  safe(() => {
    const originX = x > 1 ? x / window.innerWidth : x;
    const originY = y > 1 ? y / window.innerHeight : y;
    void confetti({
      particleCount: 35,
      spread: 360,
      startVelocity: 22,
      ticks: 150,
      origin: { x: originX, y: originY },
      colors: PALETTE,
      shapes: ["star"],
      scalar: 0.9,
    });
  });
}
