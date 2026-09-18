"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { RouteGuard } from "@/components/RouteGuard";
import { AppHeader } from "@/components/AppHeader";
import { api, ApiError, type AttendanceRecord, type AttendanceStatus, type Course } from "@/lib/api";
import type { AdminStudentDto } from "@/lib/contracts";
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

interface StudentStats {
  count: number;
  points: number;
  last?: AttendanceRecord;
}

function StudentsSection({ students, records }: { students: AdminStudentDto[]; records: AttendanceRecord[] }) {
  const statsById = useMemo(() => {
    const map = new Map<string, StudentStats>();
    for (const r of records) {
      const id = typeof r.student === "string" ? r.student : r.student._id;
      const s = map.get(id) ?? { count: 0, points: 0 };
      s.count += 1;
      s.points += r.points;
      // records vienen ordenados por día desc: el primero es el más reciente
      if (!s.last) s.last = r;
      map.set(id, s);
    }
    return map;
  }, [records]);

  const pending = students.filter((s) => s.mustChangePassword).length;

  return (
    <section className="mb-6">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold text-foreground">Estudiantes</h2>
        <p className="text-xs font-bold text-foreground-muted">
          {students.length} {students.length === 1 ? "registrado" : "registrados"}
          {pending > 0 && ` · ${pending} con clave pendiente`}
        </p>
      </div>

      {students.length === 0 ? (
        <p className="card-hard px-4 py-5 text-center font-bold text-foreground-muted">
          No hay estudiantes registrados en este filtro.
        </p>
      ) : (
        <RevealGroup className="space-y-2.5" staggerDelay={0.015}>
          {students.map((s) => {
            const stats = statsById.get(s.id);
            return (
              <RevealItem key={s.id}>
                <div className="card-hard flex flex-col gap-1 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-extrabold text-foreground">{s.name}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {s.mustChangePassword && (
                        <span className="badge-status badge-status--y">Clave pendiente de cambio</span>
                      )}
                      {!s.active && <span className="badge-status badge-status--r">Inactivo</span>}
                      {stats?.last ? (
                        <span className={STATUS_BADGE[stats.last.status]}>
                          {STATUS_LABEL[stats.last.status]}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-foreground-muted">Sin asistencias</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-foreground-muted">
                    {s.course.name || "Sin curso"} · {s.email}
                    {s.document && ` · ${s.document}`}
                  </div>
                  {stats && (
                    <div className="text-xs font-semibold text-foreground-muted">
                      {stats.count} {stats.count === 1 ? "registro" : "registros"} · {stats.points} pts
                    </div>
                  )}
                </div>
              </RevealItem>
            );
          })}
        </RevealGroup>
      )}
    </section>
  );
}

function CoordinacionBody() {
  const [students, setStudents] = useState<AdminStudentDto[]>([]);
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

    Promise.all([api.listStudents(courseId || undefined), api.allAttendance(courseId ? { courseId } : undefined)])
      .then(([studentList, data]) => {
        if (!active) return;
        setStudents(studentList);
        setRecords(data);
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof ApiError
              ? `No se pudieron cargar los estudiantes y registros: ${err.message}`
              : "No se pudieron cargar los estudiantes y registros (sin conexión con el servidor)."
          );
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
          className="btn-3d mb-3 flex w-full items-center justify-center gap-2 text-center"
        >
          Registrar estudiantes
        </Link>

        <Link
          href="/coordinacion/validar-qr"
          className="btn-3d btn-3d-outline mb-5 flex w-full items-center justify-center gap-2 text-center"
        >
          Validar sticker QR
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

        {!loading && !error && <StudentsSection students={students} records={records} />}

        {!loading && !error && (
          <h2 className="mb-2.5 text-lg font-extrabold text-foreground">Registros de asistencia</h2>
        )}

        {!loading && !error && records.length > 0 && <Summary records={records} />}

        {loading && (
          <div className="flex flex-col items-center gap-2 py-8">
            <Mascot who="gali" mood="running" size={90} />
            <p className="font-bold text-foreground-muted">Cargando estudiantes y registros...</p>
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
          <p className="text-center font-bold text-foreground-muted">Sin registros de asistencia para este filtro.</p>
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
