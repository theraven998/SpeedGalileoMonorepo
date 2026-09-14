"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useInView } from "motion/react";
import { api, type RankingEntry } from "@/lib/api";
import { RankingRow } from "@/components/RankingRow";
import { Reveal, starBurst, useReducedMotion } from "@/components/fx";

/**
 * Preview del ranking en la landing. El ranking es el % de llegadas puntuales
 * del curso (no un promedio de puntos ni algo semanal): los rótulos reflejan eso.
 */
export function RankingPreview() {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filledIdx, setFilledIdx] = useState<Set<number>>(new Set());
  const reducedMotion = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inView = useInView(wrapRef, { once: true, amount: 0.4 });
  const confettiFired = useRef(false);

  useEffect(() => {
    api
      .ranking()
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Cascada: cada barra se llena un poco después que la anterior.
  useEffect(() => {
    if (entries.length === 0) return;
    const timers = entries.map((_, i) =>
      window.setTimeout(() => {
        setFilledIdx((prev) => new Set(prev).add(i));
      }, 150 + i * 120)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [entries]);

  useEffect(() => {
    if (!inView || reducedMotion || entries.length === 0 || confettiFired.current) return;
    confettiFired.current = true;
    const t = window.setTimeout(() => starBurst(0.5, 0.4), 150 + entries.length * 120);
    return () => window.clearTimeout(t);
  }, [inView, entries, reducedMotion]);

  const displayEntries = entries.map((e, i) => (filledIdx.has(i) ? e : { ...e, pctPuntual: 0 }));

  return (
    <section id="liga" className="px-4 py-14 sm:py-16">
      <div ref={wrapRef} className="mx-auto max-w-xl">
        <div className="mx-auto mb-9 max-w-lg text-center">
          <h2 className="text-[28px] font-black tracking-tight text-foreground sm:text-4xl">Liga de cursos</h2>
          <p className="mt-2.5 font-semibold text-foreground-muted">% de llegadas puntuales de cada curso</p>
        </div>

        {loading && <p className="text-center font-bold text-foreground-muted">Cargando...</p>}
        {!loading && entries.length === 0 && (
          <p className="text-center font-bold text-foreground-muted">El ranking arranca con el piloto 🚀</p>
        )}

        {entries.length > 0 && (
          <Reveal>
            <ul className="space-y-3">
              {displayEntries.map((entry, i) => (
                <RankingRow key={entry.courseId} entry={entry} position={i} />
              ))}
            </ul>
          </Reveal>
        )}

        {entries.length > 0 && (
          <p className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-foreground-muted">
            🔒 Nadie ve quién llegó tarde. Solo el resultado del curso.
          </p>
        )}

        <Link
          href="/ranking"
          className="mt-6 block text-center text-sm font-extrabold text-primary transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          Ver tablero completo →
        </Link>
      </div>
    </section>
  );
}
