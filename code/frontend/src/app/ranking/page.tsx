"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type RankingEntry } from "@/lib/api";
import { PublicNavbar } from "@/components/PublicNavbar";
import { RankingRow } from "@/components/RankingRow";
import { Podium, type PodiumGroup } from "@/components/ranking/Podium";
import { Mascot, RevealGroup, RevealItem } from "@/components/fx";

/** Debajo de esto, "Cargando..." simple; por encima, avisamos de cold start. */
const COLD_START_MS = 1400;

type Status = "loading" | "ready" | "error";

/** Agrupa por posición (empates comparten grupo) y separa el top 3 del resto. */
function splitPodium(entries: RankingEntry[]): { podium: PodiumGroup[]; rest: RankingEntry[] } {
  const distinctPositions = Array.from(new Set(entries.map((e) => e.posicion)))
    .sort((a, b) => a - b)
    .slice(0, 3);

  const podium = distinctPositions.map((posicion) => ({
    posicion,
    entries: entries.filter((e) => e.posicion === posicion),
  }));

  const podiumIds = new Set(podium.flatMap((g) => g.entries.map((e) => e.courseId)));
  const rest = entries.filter((e) => !podiumIds.has(e.courseId));

  return { podium, rest };
}

export default function RankingPage() {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [slow, setSlow] = useState(false);

  const fetchRanking = useCallback(() => {
    const slowTimer = setTimeout(() => setSlow(true), COLD_START_MS);

    api
      .ranking()
      .then((data) => {
        setEntries(data);
        setStatus("ready");
      })
      .catch(() => {
        setStatus("error");
      })
      .finally(() => {
        clearTimeout(slowTimer);
      });
  }, []);

  const retry = useCallback(() => {
    setStatus("loading");
    setSlow(false);
    fetchRanking();
  }, [fetchRanking]);

  // Al montar, `status`/`slow` ya arrancan en sus valores de "cargando"; solo disparamos el fetch.
  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  const { podium, rest } = splitPodium(entries);

  return (
    <>
      <PublicNavbar />
      <main className="flex flex-1 flex-col px-4 py-10">
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-1 flex items-center justify-center gap-3">
            <h1 className="text-center text-3xl font-black tracking-tight text-foreground">
              Ranking de Puntualidad
            </h1>
          </div>
          <p className="mb-9 text-center font-semibold text-foreground-muted">
            % de llegadas puntuales por curso
          </p>

          {status === "loading" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Mascot who="gali" mood="running" size={120} />
              <p className="font-bold text-foreground-muted">Cargando el ranking...</p>
              {slow && (
                <p className="max-w-xs text-sm font-semibold text-foreground-muted">
                  El servidor se está despertando, puede tardar un poco…
                </p>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Mascot who="duo" mood="shocked" size={110} />
              <p className="font-bold text-danger">No pudimos cargar el ranking.</p>
              <button type="button" onClick={retry} className="btn-3d px-6 py-2.5 text-xs">
                Reintentar
              </button>
            </div>
          )}

          {status === "ready" && entries.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Mascot who="gali" mood="idle" size={120} />
              <p className="font-bold text-foreground-muted">El ranking arranca con el piloto 🚀</p>
            </div>
          )}

          {status === "ready" && entries.length > 0 && (
            <>
              <Podium groups={podium} className="mb-10" />

              {rest.length > 0 && (
                <RevealGroup className="space-y-3">
                  <ul className="space-y-3">
                    {rest.map((entry, i) => (
                      <RevealItem key={entry.courseId} className="contents">
                        <RankingRow entry={entry} position={podium.length + i} size="lg" />
                      </RevealItem>
                    ))}
                  </ul>
                </RevealGroup>
              )}

              <p className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-foreground-muted">
                🔒 Nadie ve quién llegó tarde. Solo el resultado del curso.
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
