"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RouteGuard } from "@/components/RouteGuard";
import { AppHeader } from "@/components/AppHeader";
import { RankingRow } from "@/components/RankingRow";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, type AttendanceRecord, type RankingEntry } from "@/lib/api";
import { Mascot, OutcomeOverlay, playLevelUp, cannons, type MascotMood } from "@/components/fx";
import { ProgressHeader } from "@/components/estudiante/ProgressHeader";
import { StreakFlame } from "@/components/estudiante/StreakFlame";
import { AttendancePath } from "@/components/estudiante/AttendancePath";
import { Badges } from "@/components/estudiante/Badges";
import { QrCard } from "@/components/estudiante/QrCard";
import { XP_PER_LEVEL, bogotaToday, computeStreak, computeBadges } from "@/components/estudiante/gamification";

function StudentBody() {
  const { user } = useAuth();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outcomeVisible, setOutcomeVisible] = useState(false);
  const levelUpPendingRef = useRef(false);
  const outcomeCheckedRef = useRef(false);

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

  const todayStr = useMemo(() => bogotaToday(), []);
  const todayRecord = useMemo(() => history.find((r) => r.day === todayStr) ?? null, [history, todayStr]);
  const sortedAsc = useMemo(
    () => [...history].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0)),
    [history]
  );
  const latestRecord = sortedAsc[sortedAsc.length - 1] ?? null;

  const xpTotal = useMemo(() => history.reduce((sum, r) => sum + r.points, 0), [history]);
  const xpBeforeToday = xpTotal - (todayRecord?.points ?? 0);
  const level = Math.floor(xpTotal / XP_PER_LEVEL) + 1;
  const levelBefore = Math.floor(xpBeforeToday / XP_PER_LEVEL) + 1;
  const leveledUpToday = Boolean(todayRecord) && level > levelBefore;
  const xpInLevel = xpTotal % XP_PER_LEVEL;

  const streakInfo = useMemo(() => computeStreak(history), [history]);
  const badges = useMemo(
    () => computeBadges(history, xpTotal, streakInfo.count),
    [history, xpTotal, streakInfo.count]
  );

  // Al entrar por primera vez el día de hoy con un registro de hoy: mostrar el resultado en pantalla completa.
  useEffect(() => {
    if (loading || !todayRecord || outcomeCheckedRef.current) return;
    outcomeCheckedRef.current = true;

    const key = `sg-seen-${todayStr}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      // almacenamiento no disponible: mostrar de todas formas
    }
    levelUpPendingRef.current = leveledUpToday;
    // Lectura única de localStorage tras cargar los datos: no hay forma de sincronizar esto durante el render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOutcomeVisible(true);
  }, [loading, todayRecord, todayStr, leveledUpToday]);

  function handleOutcomeDone() {
    setOutcomeVisible(false);
    try {
      localStorage.setItem(`sg-seen-${todayStr}`, "1");
    } catch {
      // almacenamiento no disponible: ignorar
    }
    if (levelUpPendingRef.current) {
      levelUpPendingRef.current = false;
      setTimeout(() => {
        playLevelUp();
        cannons();
      }, 250);
    }
  }

  const mascotMood: MascotMood = loading
    ? "running"
    : error
      ? "shocked"
      : !latestRecord
        ? "idle"
        : streakInfo.count >= 3
          ? "cheer"
          : latestRecord.status === "tarde"
            ? "sad"
            : "happy";

  // user.course es el id del curso, no el nombre: sin registros no hay nombre que mostrar.
  const courseName = latestRecord?.course.name ?? "";

  return (
    <main className="flex flex-1 flex-col gap-8 px-4 py-6 pb-16">
      {outcomeVisible && todayRecord && (
        <OutcomeOverlay
          status={todayRecord.status}
          points={todayRecord.points}
          minutesLate={todayRecord.minutesLate}
          onDone={handleOutcomeDone}
        />
      )}

      <div className="mx-auto flex w-full max-w-sm items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mascot who="gali" mood={mascotMood} size={72} />
          {!loading && !error && history.length === 0 && (
            <p className="text-sm font-bold text-foreground-muted">¡Tu primer escaneo te espera!</p>
          )}
        </div>
      </div>

      {error && <p className="mx-auto w-full max-w-sm text-center text-sm font-bold text-danger">{error}</p>}

      {loading && <p className="text-center font-bold text-foreground-muted">Cargando...</p>}

      {!loading && (
        <>
          {user?.qrToken && <QrCard token={user.qrToken} name={user.name} course={courseName} />}

          <ProgressHeader xpTotal={xpTotal} level={level} xpInLevel={xpInLevel} />

          <StreakFlame streak={streakInfo.count} isOff={streakInfo.isOff} />

          <section className="mx-auto w-full max-w-sm">
            <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-foreground-muted">
              Mi historial
            </h2>
            <AttendancePath records={history} />
          </section>

          <Badges badges={badges} />

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
