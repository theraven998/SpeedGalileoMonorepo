"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { RankingEntry } from "@/lib/api";
import { CountUp, Mascot, fireworks, playFanfare, starBurst, useReducedMotion } from "@/components/fx";
import { courseInitials } from "@/components/RankingRow";

export interface PodiumGroup {
  /** Posición compartida por todos los cursos del grupo (empate). */
  posicion: number;
  entries: RankingEntry[];
}

export interface PodiumProps {
  /** Grupos ordenados ascendente por posición, máximo 3 (índice 0 = 1er lugar). */
  groups: PodiumGroup[];
  className?: string;
}

type Rank = 1 | 2 | 3;

const RANK_INFO: Record<Rank, { medal: string; tone: string; ring: string; height: number }> = {
  1: { medal: "🥇", tone: "bg-amarillo", ring: "border-amarillo", height: 168 },
  2: { medal: "🥈", tone: "bg-azul", ring: "border-azul", height: 116 },
  3: { medal: "🥉", tone: "bg-naranja", ring: "border-naranja", height: 88 },
};

/** El podio sube en el orden 3º→2º→1º; este mapa dice en qué "stage" aparece cada uno. */
const STAGE_FOR_RANK: Record<Rank, number> = { 3: 1, 2: 2, 1: 3 };

const VISUAL_ORDER: Rank[] = [2, 1, 3];

function pctOf(group: PodiumGroup): number {
  const raw = group.entries[0]?.pctPuntual ?? 0;
  return Math.max(0, Math.min(100, Math.round(raw * 100)));
}

function PodiumCard({
  rank,
  group,
  stage,
  reducedMotion,
  onCrownLanded,
}: {
  rank: Rank;
  group: PodiumGroup;
  stage: number;
  reducedMotion: boolean;
  onCrownLanded: () => void;
}) {
  const info = RANK_INFO[rank];
  const visible = stage >= STAGE_FOR_RANK[rank];
  const pct = pctOf(group);
  const names = group.entries.map((e) => e.courseName).join(" · ");
  const dur = reducedMotion ? 0.01 : undefined;
  const delay = reducedMotion ? 0 : undefined;

  return (
    <div className="flex w-24 flex-col items-center sm:w-32">
      <div className="relative mb-2 flex h-14 flex-col items-center justify-end">
        {rank === 1 && (
          <motion.span
            className="pointer-events-none absolute -top-8 select-none text-3xl sm:-top-9 sm:text-4xl"
            initial={reducedMotion ? false : { y: -70, opacity: 0, rotate: -140 }}
            animate={visible ? { y: 0, opacity: 1, rotate: 0 } : {}}
            transition={{ type: "spring", bounce: 0.55, duration: dur ?? 0.6, delay: delay ?? 0.85 }}
            onAnimationComplete={() => {
              if (visible) onCrownLanded();
            }}
            aria-hidden
          >
            👑
          </motion.span>
        )}
        <div className="flex -space-x-2">
          {group.entries.slice(0, 3).map((e, i) => (
            <motion.span
              key={e.courseId}
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-xs font-black text-white shadow sm:h-12 sm:w-12 sm:text-sm ${info.tone}`}
              initial={reducedMotion ? false : { y: -50, opacity: 0 }}
              animate={visible ? { y: 0, opacity: 1 } : {}}
              transition={{ type: "spring", bounce: 0.5, duration: dur ?? 0.45, delay: delay ?? 0.15 + i * 0.06 }}
            >
              {courseInitials(e.courseName)}
            </motion.span>
          ))}
        </div>
      </div>

      <p
        className="mb-1 line-clamp-2 max-w-full text-center text-[11px] font-extrabold leading-tight text-foreground sm:text-xs"
        title={names}
      >
        {names}
      </p>

      <span className={`text-base font-black sm:text-lg ${rank === 1 ? "text-amarillo-oscuro" : "text-foreground"}`}>
        <CountUp value={visible ? pct : 0} duration={1} suffix="%" />
      </span>

      <span className="prog-bar mt-1 block h-1.5 w-16 overflow-hidden rounded-full bg-border sm:w-20">
        <motion.i
          className={`block h-full rounded-full ${info.tone} ${rank === 1 ? "animate-shine" : ""}`}
          initial={reducedMotion ? false : { width: "0%" }}
          animate={{ width: visible ? `${pct}%` : "0%" }}
          transition={{ type: "spring", bounce: 0.2, duration: dur ?? 0.9, delay: delay ?? 0.2 }}
        />
      </span>

      <motion.div
        className={`mt-2 flex w-full items-start justify-center overflow-hidden rounded-t-2xl border-2 border-b-0 ${info.ring} ${info.tone} shadow-inner`}
        initial={reducedMotion ? false : { height: 0 }}
        animate={{ height: visible ? info.height : 0 }}
        transition={{ type: "spring", bounce: 0.35, duration: dur ?? 0.55 }}
      >
        <span className="mt-2 text-2xl">{info.medal}</span>
      </motion.div>
    </div>
  );
}

/**
 * Una corrida de la animación del podio: sube 3º→2º→1º, deja caer avatares y
 * corona, y celebra al terminar. Se remonta por completo (vía `key`) cada vez
 * que "Ver de nuevo" pide una nueva corrida, así el estado nace limpio sin
 * necesidad de resetearlo a mano dentro de un efecto.
 */
function PodiumRun({ groups }: { groups: PodiumGroup[] }) {
  const reducedMotion = useReducedMotion();
  const [stage, setStage] = useState(() => (reducedMotion ? 3 : 0));
  const [celebrated, setCelebrated] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const t1 = setTimeout(() => setStage(1), 50);
    const t2 = setTimeout(() => setStage(2), 400);
    const t3 = setTimeout(() => setStage(3), 750);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [reducedMotion]);

  function celebrate() {
    setCelebrated((was) => {
      if (was) return was;
      starBurst(0.5, 0.3);
      fireworks(1600);
      playFanfare();
      return true;
    });
  }

  const summary = groups
    .map((g) => `${g.posicion}° lugar: ${g.entries.map((e) => e.courseName).join(", ")} con ${pctOf(g)}%`)
    .join(". ");

  return (
    <>
      <div className="sr-only" role="status">
        Podio de puntualidad. {summary}.
      </div>

      <div aria-hidden className="flex items-end justify-center gap-3 sm:gap-5">
        {VISUAL_ORDER.map((rank) => {
          const group = groups[rank - 1];
          if (!group) return null;
          return (
            <PodiumCard
              key={rank}
              rank={rank}
              group={group}
              stage={stage}
              reducedMotion={reducedMotion}
              onCrownLanded={celebrate}
            />
          );
        })}
      </div>

      <div className="mt-5 flex justify-center">
        <Mascot who="gali" mood={celebrated ? "cheer" : "idle"} size={84} />
      </div>
    </>
  );
}

/**
 * Podio top 3 del ranking público. Columnas que suben en secuencia 3º→2º→1º,
 * avatares que caen encima, corona que desciende y aterriza sobre el 1º
 * (fuegos artificiales + fanfarria al completar). Incluye Gali animando al
 * lado y un botón para repetir la secuencia.
 */
export function Podium({ groups, className }: PodiumProps) {
  const [runId, setRunId] = useState(0);

  if (groups.length === 0) return null;

  return (
    <div className={className}>
      <PodiumRun key={runId} groups={groups} />

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => setRunId((v) => v + 1)}
          className="btn-3d btn-3d-outline px-5 py-2.5 text-xs"
        >
          🔁 Ver de nuevo
        </button>
      </div>
    </div>
  );
}
