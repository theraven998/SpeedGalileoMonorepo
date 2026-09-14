"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Mascot, useReducedMotion } from "@/components/fx";

const PHRASES = [
  "Despertando al servidor…",
  "Gali está corriendo…",
  "El servidor estaba dormido, dale un segundo…",
  "Ya casi, un poquito más…",
];

/**
 * Cubre la pantalla desde el primer milisegundo del envío (spinner simple)
 * y, si tarda más de 1.5 s (cold start de Render), sube a mascota corriendo
 * + texto rotativo para que la fila no piense que se colgó.
 */
export function SendingOverlay() {
  const reducedMotion = useReducedMotion();
  const [slow, setSlow] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!slow) return;
    const id = setInterval(() => setPhraseIdx((i) => (i + 1) % PHRASES.length), 2400);
    return () => clearInterval(id);
  }, [slow]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[900] flex flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ backgroundColor: "#1cb0f6" }}
    >
      {slow ? (
        <>
          <Mascot who="gali" mood="running" size={130} />
          <p className="text-lg font-black text-white">{PHRASES[phraseIdx]}</p>
          <p className="text-xs font-bold text-white/80">El primer registro del día puede tardar unos segundos</p>
        </>
      ) : (
        <>
          <motion.span
            className="h-14 w-14 rounded-full border-4 border-white/40 border-t-white"
            animate={reducedMotion ? {} : { rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-lg font-black text-white">Enviando…</p>
        </>
      )}
    </div>
  );
}
