"use client";

import { useEffect, useState } from "react";
import { RouteGuard } from "@/components/RouteGuard";
import { AppHeader } from "@/components/AppHeader";
import { api, type AttendanceRecord } from "@/lib/api";

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

function CoordinacionBody() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [courses, setCourses] = useState<{ _id: string; name: string }[]>([]);
  const [courseId, setCourseId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.courses().then(setCourses);
  }, []);

  useEffect(() => {
    let active = true;
    api
      .allAttendance(courseId ? { courseId } : undefined)
      .then((data) => {
        if (active) setRecords(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [courseId]);

  return (
    <main className="flex flex-1 flex-col px-4 py-7">
      <div className="mx-auto w-full max-w-2xl">
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="mb-5 w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
        >
          <option value="">Todos los cursos</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        {loading && <p className="text-center font-bold text-foreground-muted">Cargando...</p>}

        <ul className="space-y-2.5">
          {records.map((r) => {
            const student = typeof r.student === "string" ? null : r.student;
            return (
              <li key={r._id} className="card-hard px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-extrabold text-foreground">{student?.name ?? "—"}</span>
                  <span className={STATUS_BADGE[r.status]}>
                    {STATUS_LABEL[r.status]} · {r.points} pts
                  </span>
                </div>
                <div className="mt-1 text-xs font-semibold text-foreground-muted">
                  {r.course.name} · {new Date(r.scannedAt).toLocaleString("es-CO")}
                </div>
              </li>
            );
          })}
        </ul>

        {!loading && records.length === 0 && (
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
