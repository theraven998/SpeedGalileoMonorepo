"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/components/fx";

export type FrameColor = "neutral" | "g" | "y" | "r";

export const FRAME_COLOR_HEX: Record<FrameColor, string> = {
  neutral: "#1cb0f6",
  g: "#58cc02",
  y: "#ffc800",
  r: "#ff4b4b",
};

const CORNERS = [
  { key: "tl", pos: "top-3 left-3", border: "border-l-4 border-t-4 rounded-tl-2xl" },
  { key: "tr", pos: "top-3 right-3", border: "border-r-4 border-t-4 rounded-tr-2xl" },
  { key: "bl", pos: "bottom-3 left-3", border: "border-l-4 border-b-4 rounded-bl-2xl" },
  { key: "br", pos: "bottom-3 right-3", border: "border-r-4 border-b-4 rounded-br-2xl" },
] as const;

export interface ScannerFrameProps {
  /** Id del contenedor que gestiona html5-qrcode. Debe quedar vacío: la librería reemplaza su contenido. */
  scannerId: string;
  /** Color del borde/marco, refleja el último resultado (verde/amarillo/rojo) o "neutral". */
  color: FrameColor;
  /** Si es false (enviando/overlay visible), la línea láser se detiene. */
  scanning: boolean;
}

/** Marco "vivo" del escáner: esquinas que laten, láser que barre, borde reactivo al último resultado. */
export function ScannerFrame({ scannerId, color, scanning }: ScannerFrameProps) {
  const reducedMotion = useReducedMotion();
  const hex = FRAME_COLOR_HEX[color];

  return (
    <div
      className="relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl border-4 bg-black transition-colors duration-500"
      style={{ borderColor: hex }}
    >
      <div id={scannerId} className="bg-black" />

      <div className="pointer-events-none absolute inset-0">
        {CORNERS.map(({ key, pos, border }) => (
          <motion.span
            key={key}
            className={`absolute h-7 w-7 ${pos} ${border}`}
            style={{ borderColor: hex }}
            animate={reducedMotion ? { opacity: 0.9 } : { opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {scanning && !reducedMotion && (
          <motion.div
            className="absolute inset-x-4 h-1 rounded-full"
            style={{ background: hex, boxShadow: `0 0 14px 2px ${hex}` }}
            initial={{ top: "6%" }}
            animate={{ top: ["6%", "92%", "6%"] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>
    </div>
  );
}
