"use client";

import { useEffect, useState } from "react";
import { api, type RankingEntry } from "@/lib/api";
import { PublicNavbar } from "@/components/PublicNavbar";
import { RankingRow } from "@/components/RankingRow";

export default function RankingPage() {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .ranking()
      .then(setEntries)
      .catch(() => setError("No se pudo cargar el ranking"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PublicNavbar />
      <main className="flex flex-1 flex-col px-4 py-10">
        <div className="mx-auto w-full max-w-xl">
          <h1 className="text-center text-3xl font-black tracking-tight text-foreground">
            Ranking de Puntualidad
          </h1>
          <p className="mb-9 text-center font-semibold text-foreground-muted">
            Promedio de puntos por curso
          </p>

          {loading && <p className="text-center font-bold text-foreground-muted">Cargando...</p>}
          {error && <p className="text-center font-bold text-danger">{error}</p>}

          <ul className="space-y-3">
            {entries.map((entry, i) => (
              <RankingRow key={entry.courseId} entry={entry} position={i} size="lg" />
            ))}
          </ul>

          {!loading && entries.length === 0 && !error && (
            <p className="text-center font-bold text-foreground-muted">Aún no hay registros.</p>
          )}

          {entries.length > 0 && (
            <p className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-foreground-muted">
              🔒 Nadie ve quién llegó tarde. Solo el resultado del curso.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
