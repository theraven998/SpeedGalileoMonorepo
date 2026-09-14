"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { useReducedMotion, playTap } from "@/components/fx";

export interface QrCardProps {
  token: string;
  name: string;
  course: string;
}

/** Carnet QR flotante: brillo que barre, voltea en 3D al tocar mostrando nombre y curso. */
export function QrCard({ token, name, course }: QrCardProps) {
  const [flipped, setFlipped] = useState(false);
  const reducedMotion = useReducedMotion();

  return (
    <section className="mx-auto w-full max-w-sm" style={{ perspective: 1000 }}>
      <motion.div
        animate={reducedMotion ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.button
          type="button"
          onClick={() => {
            playTap();
            setFlipped((f) => !f);
          }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: "easeInOut" }}
          className="relative block h-60 w-full [transform-style:preserve-3d]"
          aria-label="Voltear carnet"
        >
          <div className="card-hard animate-shine absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 [backface-visibility:hidden]">
            <div className="rounded-2xl border-2 border-border bg-white p-3">
              <QRCodeSVG value={token} size={168} />
            </div>
            <p className="text-center text-xs font-semibold text-foreground-muted">Muéstralo en portería para que te lo escaneen</p>
          </div>

          <div
            className="card-hard absolute inset-0 flex flex-col items-center justify-center gap-2 bg-primary p-4 text-center text-white [backface-visibility:hidden]"
            style={{ transform: "rotateY(180deg)" }}
          >
            <span className="text-4xl" aria-hidden>
              🪪
            </span>
            <p className="text-lg font-black">{name}</p>
            <p className="text-sm font-bold opacity-90">{course}</p>
          </div>
        </motion.button>
      </motion.div>
    </section>
  );
}
