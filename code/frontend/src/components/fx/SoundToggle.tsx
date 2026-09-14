"use client";

import { useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { getMutedSnapshot, subscribeMuted, toggleMuted } from "./sound";

export interface SoundToggleProps {
  className?: string;
}

/** Botón pequeño de mute/unmute con micro-animación al pulsar. */
export function SoundToggle({ className }: SoundToggleProps) {
  const muted = useSyncExternalStore(subscribeMuted, getMutedSnapshot, () => false);

  return (
    <motion.button
      type="button"
      onClick={toggleMuted}
      whileTap={{ scale: 0.8, rotate: muted ? 8 : -8 }}
      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-border bg-surface text-lg leading-none ${className ?? ""}`}
      aria-label={muted ? "Activar sonido" : "Silenciar sonido"}
      aria-pressed={muted}
    >
      {muted ? "🔇" : "🔊"}
    </motion.button>
  );
}
