"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "./useReducedMotion";

export interface XpBurstProps {
  points: number;
  /** Se llama cuando termina la animación: el padre debe desmontar el componente. */
  onDone?: () => void;
  className?: string;
}

const ORBIT_ICONS = ["⭐", "🪙", "⭐", "🪙"];

/** "+N XP" disparado hacia arriba con monedas/estrellas orbitando. Se "autodestruye" vía onDone. */
export function XpBurst({ points, onDone, className }: XpBurstProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={`pointer-events-none relative inline-flex items-center justify-center ${className ?? ""}`}>
      {!reducedMotion &&
        ORBIT_ICONS.map((icon, i) => {
          const angle = (i / ORBIT_ICONS.length) * Math.PI * 2;
          return (
            <motion.span
              key={i}
              className="absolute select-none text-xl"
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
              animate={{
                x: [0, Math.cos(angle) * 46, Math.cos(angle) * 64],
                y: [0, Math.sin(angle) * 46 - 10, Math.sin(angle) * 64 - 64],
                opacity: [0, 1, 0],
                scale: [0.4, 1, 0.6],
                rotate: 360,
              }}
              transition={{ duration: 1.1, delay: i * 0.05, ease: "easeOut" }}
            >
              {icon}
            </motion.span>
          );
        })}
      <motion.span
        className="select-none text-2xl font-black text-amarillo-oscuro drop-shadow"
        initial={{ y: 0, opacity: 0, scale: 0.5 }}
        animate={
          reducedMotion
            ? { opacity: [0, 1, 1, 0], scale: 1 }
            : { y: -70, opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.9] }
        }
        transition={{ duration: reducedMotion ? 1 : 1.2, ease: "easeOut" }}
        onAnimationComplete={onDone}
      >
        +{points} XP
      </motion.span>
    </div>
  );
}
