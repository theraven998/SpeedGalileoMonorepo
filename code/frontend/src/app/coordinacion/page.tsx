"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { RouteGuard } from "@/components/RouteGuard";
import { AppHeader } from "@/components/AppHeader";
import { api, type AttendanceRecord, type AttendanceStatus, type Course } from "@/lib/api";
import { CountUp, Mascot, RevealGroup, RevealItem, useReducedMotion } from "@/components/fx";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  temprano: "Temprano",
  a_tiempo: "A tiempo",
  tarde: "Tarde",
};
const STATUS_BADGE: Record<AttendanceStatus, string> = {
  temprano: "badge-status badge-status--g",
  a_tiempo: "badge-status badge-status--y",
  tarde: "badge-status badge-status--r",
};
const STATUS_BAR: Record<AttendanceStatus, string> = {
  temprano: "bg-verde",
  a_tiempo: "bg-amarillo",
  tarde: "bg-rojo",
};
const STATUS_ORDER: AttendanceStatus[] = ["temprano", "a_tiempo", "tarde"];

const COLD_START_MS = 1500;

function StatusIcon({ status }: { status: AttendanceStatus }) {
  const reducedMotion = useReducedMotion();

  if (status === "temprano") {
    return (
      <motion.span
        aria-hidden
        animate={reducedMotion ? {} : { rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        ⭐
      </motion.span>
    );
  }
  if (status === "a_tiempo") {
    return (
      <motion.span
        aria-hidden
        animate={reducedMotion ? {} : { rotate: [0, 12, -12, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      >
        🕐
      </motion.span>
    );
  }
  return (
    <motion.span
      aria-hidden
      animate={reducedMotion ? {} : { y: [0, 3, 0], opacity: [1, 0.65, 1] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
    >
      💧
    </motion.span>
  );
}

function Summary({ records }: { records: AttendanceRecord[] }) {
  const counts = useMemo(() => {
    const base: Record<AttendanceStatus, number> = { temprano: 0, a_tiempo: 0, tarde: 0 };
    for (const r of records) base[r.status] += 1;
    return base;
  }, [records]);
  const total = records.length;

  return (
    <div className="card-hard mb-5 grid grid-cols-3 gap-3 p-4">
      {STATUS_ORDER.map((status) => {
        const count = counts[status];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={status} className="text-center">
            <div className="text-[11px] font-bold uppercase tracking-wide text-foreground-muted">
              {STATUS_LABEL[status]}
            </div>
            <CountUp value={count} duration={0.8} className="block text-2xl font-black text-foreground" />
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
              <motion.i
                className={`block h-full rounded-full ${STATUS_BAR[status]}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CoordinacionBody() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coldStart, setColdStart] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    api
      .courses()
      .then(setCourses)
      .catch(() => {
        /* el filtro de curso queda vacío; no bloquea el listado principal */
      });
  }, []);

  useEffect(() => {
    let active = true;
    const coldTimer = setTimeout(() => {
      if (active) setColdStart(true);
    }, COLD_START_MS);

    api
      .allAttendance(courseId ? { courseId } : undefined)
      .then((data) => {
        if (active) setRecords(data);
      })
      .catch(() => {
        if (active) setError("No se pudieron cargar los registros.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setColdStart(false);
        }
      });

    return () => {
      active = false;
      clearTimeout(coldTimer);
    };
  }, [courseId, retryTick]);

  function handleCourseChange(id: string) {
    setLoading(true);
    setError(null);
    setColdStart(false);
    setCourseId(id);
  }

  function handleRetry() {
    setLoading(true);
    setError(null);
    setColdStart(false);
    setRetryTick((t) => t + 1);
  }

  return (
    <main className="flex flex-1 flex-col px-4 py-7">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/coordinacion/estudiantes"
          className="btn-3d mb-5 flex w-full items-center justify-center gap-2 text-center"
        >
          Registrar estudiantes
        </Link>

        <select
          value={courseId}
          onChange={(e) => handleCourseChange(e.target.value)}
          className="mb-5 w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
        >
          <option value="">Todos los cursos</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {!loading && !error && records.length > 0 && <Summary records={records} />}

        {loading && (
          <div className="flex flex-col items-center gap-2 py-8">
            <Mascot who="gali" mood="running" size={90} />
            <p className="font-bold text-foreground-muted">Cargando registros...</p>
            {coldStart && (
              <p className="text-center text-xs font-semibold text-foreground-muted">
                El servidor está despertando, puede tardar unos segundos.
              </p>
            )}
          </div>
        )}

        {!loading && error && (
          <div className="card-hard flex flex-col items-center gap-3 p-6 text-center">
            <Mascot who="duo" mood="sad" size={80} />
            <p className="font-bold text-foreground">{error}</p>
            <button type="button" onClick={handleRetry} className="btn-3d px-5 py-2 text-xs">
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && records.length > 0 && (
          <RevealGroup className="space-y-2.5" staggerDelay={0.015}>
            {records.map((r) => {
              const student = typeof r.student === "string" ? null : r.student;
              return (
                <RevealItem key={r._id}>
                  <div className="card-hard flex flex-col px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-extrabold text-foreground">{student?.name ?? "—"}</span>
                      <span className={STATUS_BADGE[r.status]}>
                        <StatusIcon status={r.status} /> {STATUS_LABEL[r.status]} · {r.points} pts
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-foreground-muted">
                      {r.course.name} · {new Date(r.scannedAt).toLocaleString("es-CO")}
                    </div>
                  </div>
                </RevealItem>
              );
            })}
          </RevealGroup>
        )}

        {!loading && !error && records.length === 0 && (
          <p className="text-center font-bold text-foreground-muted">Sin registros para este filtro.</p>
        )}
      </div>
    </main>
  );
}

export default function CoordinacionPage() {
  return (
    <RouteGuard allow={["coordinacion"]}>
      <AppHeader title="Detalle de asistencia" />
      <CoordinacionBody />
    </RouteGuard>
  );
}
