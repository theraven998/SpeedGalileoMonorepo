"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CountUp, useReducedMotion } from "@/components/fx";
import type { AttendanceStatus } from "@/lib/api";

export interface ScanHistoryItem {
  id: string;
  name: string;
  status: AttendanceStatus;
  /** Cómo se registró. Sin QR de por medio se marca en el historial para que quede claro. */
  source?: "qr" | "documento";
}

export interface SessionScoreboardProps {
  stats: Record<AttendanceStatus, number>;
  combo: number;
  /** Se incrementa cada vez que un "tarde" rompe un combo activo; dispara la animación de combo roto. */
  comboBreakSignal: number;
  history: ScanHistoryItem[];
}

const STAT_ORDER: AttendanceStatus[] = ["temprano", "a_tiempo", "tarde"];

const STAT_META: Record<AttendanceStatus, { label: string; cls: string }> = {
  temprano: { label: "Temprano", cls: "text-verde-oscuro" },
  a_tiempo: { label: "A tiempo", cls: "text-azul-oscuro" },
  tarde: { label: "Tarde", cls: "text-rojo-oscuro" },
};

const HISTORY_DOT: Record<AttendanceStatus, string> = {
  temprano: "bg-verde",
  a_tiempo: "bg-amarillo",
  tarde: "bg-rojo",
};

const HISTORY_LABEL: Record<AttendanceStatus, string> = {
  temprano: "Temprano",
  a_tiempo: "A tiempo",
  tarde: "Tarde",
};

function ComboBadge({ combo, breakSignal }: { combo: number; breakSignal: number }) {
  const reducedMotion = useReducedMotion();
  const [showBreak, setShowBreak] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setShowBreak(true);
    const t = setTimeout(() => setShowBreak(false), 1100);
    return () => clearTimeout(t);
  }, [breakSignal]);

  if (showBreak) {
    return (
      <motion.div
        key={`break-${breakSignal}`}
        className={`card-hard flex items-center gap-2 border-rojo px-3 py-1.5 ${reducedMotion ? "" : "animate-shake-hard"}`}
        initial={reducedMotion ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <span className="text-lg" aria-hidden>
          💔
        </span>
        <span className="text-xs font-black uppercase tracking-wide text-rojo-oscuro">Combo perdido</span>
      </motion.div>
    );
  }

  if (combo < 2) return null;

  return (
    <motion.div
      key={combo}
      className="card-hard flex items-center gap-2 border-naranja px-3 py-1.5"
      initial={reducedMotion ? undefined : { scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", bounce: 0.5, duration: 0.5 }}
    >
      <span className={reducedMotion ? "text-lg" : "animate-flame text-lg"} aria-hidden>
        🔥
      </span>
      <span className="text-xs font-black uppercase tracking-wide text-naranja">Combo x{combo}</span>
    </motion.div>
  );
}

/** Marcador de la jornada (estado local, no persiste): contadores, racha/combo y últimos 5 escaneos. */
export function SessionScoreboard({ stats, combo, comboBreakSignal, history }: SessionScoreboardProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="card-hard flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-4">
          {STAT_ORDER.map((status) => (
            <div key={status} className="text-center">
              <CountUp
                value={stats[status]}
                duration={0.5}
                className={`block text-2xl font-black ${STAT_META[status].cls}`}
              />
              <span className="text-[10px] font-bold uppercase tracking-wide text-foreground-muted">
                {STAT_META[status].label}
              </span>
            </div>
          ))}
        </div>
        <ComboBadge combo={combo} breakSignal={comboBreakSignal} />
      </div>

      {history.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {history.map((item, i) => (
              <motion.li
                key={item.id}
                layout
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -18, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, delay: reducedMotion ? 0 : i * 0.04 }}
                className="flex items-center gap-2 rounded-xl bg-background-alt px-3 py-1.5"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${HISTORY_DOT[item.status]}`} aria-hidden />
                <span className="truncate text-sm font-bold text-foreground">{item.name}</span>
                {item.source === "documento" && (
                  <span className="shrink-0 rounded-full bg-background-alt px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-foreground-muted">
                    Doc
                  </span>
                )}
                <span className="ml-auto shrink-0 text-[11px] font-black uppercase text-foreground-muted">
                  {HISTORY_LABEL[item.status]}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
