"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RouteGuard } from "@/components/RouteGuard";
import { AppHeader } from "@/components/AppHeader";
import { RankingRow } from "@/components/RankingRow";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, type AttendanceRecord, type RankingEntry } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  temprano: "Temprano",
  a_tiempo: "A tiempo",
  tarde: "Tarde",
};
const STATUS_BADGE: Record<string, string> = {
  temprano: "badge-status badge-status--g",
  a_tiempo: "badge-status badge-status--y",
  tarde: "badge-status badge-status--r",
};

function StudentBody() {
  const { user } = useAuth();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.myAttendance(), api.ranking()])
      .then(([h, r]) => {
        setHistory(h);
        setRanking(r);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "No se pudieron cargar los datos");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-9 px-4 py-7">
      {user?.qrToken && (
        <section className="mx-auto w-full max-w-sm">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-foreground-muted">
            Mi código QR
          </h2>
          <div className="card-hard flex flex-col items-center gap-3 p-6">
            <div className="rounded-2xl border-2 border-border bg-white p-3">
              <QRCodeSVG value={user.qrToken} size={200} />
            </div>
            <p className="text-center text-sm font-semibold text-foreground-muted">
              Muéstralo en portería para que te lo escaneen
            </p>
          </div>
        </section>
      )}

      {error && <p className="mx-auto w-full max-w-sm text-center text-sm font-bold text-danger">{error}</p>}

      {loading && <p className="text-center font-bold text-foreground-muted">Cargando...</p>}

      {!loading && (
        <>
          <section className="mx-auto w-full max-w-sm">
            <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-foreground-muted">
              Ranking de cursos
            </h2>
            {ranking.length === 0 && !error && (
              <p className="text-sm font-semibold text-foreground-muted">Aún no hay registros.</p>
            )}
            <ul className="space-y-2.5">
              {ranking.map((r, i) => (
                <RankingRow key={r.courseId} entry={r} position={i} />
              ))}
            </ul>
          </section>

          <section className="mx-auto w-full max-w-sm">
            <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-foreground-muted">
              Mi historial
            </h2>
            {history.length === 0 && !error && (
              <p className="text-sm font-semibold text-foreground-muted">Sin registros aún.</p>
            )}
            <ul className="space-y-2.5">
              {history.map((r) => (
                <li
                  key={r._id}
                  className="card-hard flex items-center justify-between px-4 py-3"
                >
                  <span className="text-sm font-semibold text-foreground-muted">
                    {new Date(r.scannedAt).toLocaleDateString("es-CO")}{" "}
                    {new Date(r.scannedAt).toLocaleTimeString("es-CO")}
                  </span>
                  <span className={STATUS_BADGE[r.status]}>
                    {STATUS_LABEL[r.status]} · {r.points} pts
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-center justify-center gap-4 text-xs font-extrabold uppercase tracking-wide text-foreground-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-verde" /> 3 pts
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amarillo" /> 2 pts
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rojo" /> 0 pts
              </span>
            </p>
          </section>
        </>
      )}
    </main>
  );
}

export default function EstudiantePage() {
  return (
    <RouteGuard allow={["estudiante"]}>
      <AppHeader title="Mi puntualidad" />
      <StudentBody />
    </RouteGuard>
  );
}
