"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { RouteGuard } from "@/components/RouteGuard";
import { AppHeader } from "@/components/AppHeader";
import { api, ApiError } from "@/lib/api";
import { TZ, type AdminCourseDto, type AdminStudentDto, type CreateStudentResponse } from "@/lib/contracts";
import { CountUp, HAPTIC, Mascot, playCoin, playError, vibrate } from "@/components/fx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOCUMENT_RE = /^[A-Z0-9]{5,15}$/;
const COLD_START_MS = 5000;

function normalizeDocument(raw: string): string {
  return raw.replace(/[\s.-]/g, "").toUpperCase();
}

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CO", {
  timeZone: TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatCreatedAt(iso: string): string {
  return DATE_FORMATTER.format(new Date(iso));
}

type FormErrorField = "document" | "email" | null;

interface RegisterFormProps {
  courses: AdminCourseDto[];
  coursesLoading: boolean;
  coursesError: string | null;
  courseId: string;
  onCourseChange: (id: string) => void;
  onCreated: () => void;
}

function RegisterForm({ courses, coursesLoading, coursesError, courseId, onCourseChange, onCreated }: RegisterFormProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [documentValue, setDocumentValue] = useState("");
  const [documentTouched, setDocumentTouched] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [coldStart, setColdStart] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formErrorField, setFormErrorField] = useState<FormErrorField>(null);
  const [errorTick, setErrorTick] = useState(0);

  const [successData, setSuccessData] = useState<CreateStudentResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (successData) nextButtonRef.current?.focus();
  }, [successData]);

  const nameValid = name.trim().length > 0;
  const emailValid = EMAIL_RE.test(email);
  const normalizedDocument = normalizeDocument(documentValue);
  const documentValid = DOCUMENT_RE.test(normalizedDocument);
  const canSubmit = nameValid && emailValid && documentValid && Boolean(courseId) && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setFormError(null);
    setFormErrorField(null);
    setSubmitting(true);
    setColdStart(false);
    const coldTimer = setTimeout(() => setColdStart(true), COLD_START_MS);

    try {
      const res = await api.createStudent({
        name: name.trim(),
        email: email.trim(),
        document: normalizedDocument,
        courseId,
      });
      setSuccessData(res);
      setCopied(false);
      playCoin();
      vibrate([...HAPTIC.ok]);
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        if (err.status === 409) {
          const lower = err.message.toLowerCase();
          setFormErrorField(lower.includes("documento") ? "document" : lower.includes("correo") ? "email" : null);
        }
      } else {
        setFormError("No se pudo registrar al estudiante. Revisa tu conexión e intenta de nuevo.");
      }
      setErrorTick((t) => t + 1);
      playError();
      vibrate([...HAPTIC.fail]);
    } finally {
      clearTimeout(coldTimer);
      setColdStart(false);
      setSubmitting(false);
    }
  }

  function handleNext() {
    setSuccessData(null);
    setName("");
    setEmail("");
    setDocumentValue("");
    setDocumentTouched(false);
    setFormError(null);
    setFormErrorField(null);
    setErrorTick(0);
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }

  function handleCopy() {
    if (!successData) return;
    navigator.clipboard
      ?.writeText(successData.tempPassword)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        /* portapapeles no disponible: el usuario puede seleccionar el texto a mano */
      });
  }

  if (successData) {
    return (
      <div className="card-hard animate-shine flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <Mascot who="diego" mood="cheer" size={56} />
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-foreground">{successData.student.name}</p>
            <p className="truncate text-sm font-semibold text-foreground-muted">{successData.student.course.name}</p>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-dashed border-border bg-background-alt p-4 text-center">
          <p className="text-xs font-extrabold uppercase tracking-wide text-foreground-muted">Contraseña temporal</p>
          <p className="mt-1 select-all break-all font-mono text-2xl font-black tracking-wider text-foreground">
            {successData.tempPassword}
          </p>
          <button type="button" onClick={handleCopy} className="btn-3d btn-3d-outline mt-3 px-4 py-2 text-xs">
            {copied ? "¡Copiada!" : "Copiar"}
          </button>
          <p role="alert" className="mt-2 text-xs font-extrabold text-danger">
            Anótala ahora: no se volverá a mostrar.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="rounded-2xl border-2 border-border bg-white p-3">
            <QRCodeSVG value={successData.qrToken} size={140} />
          </div>
          <p className="text-xs font-semibold text-foreground-muted">Carnet QR del estudiante, para verificación visual</p>
        </div>

        <button ref={nextButtonRef} type="button" onClick={handleNext} className="btn-3d w-full">
          Registrar siguiente
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`card-hard space-y-4 p-6 ${errorTick > 0 ? "animate-shake-hard" : ""}`}
    >
      <h2 className="text-lg font-extrabold text-foreground">Registrar estudiante</h2>

      <div>
        <label htmlFor="student-name" className="mb-1 block text-sm font-extrabold text-foreground">
          Nombre completo
        </label>
        <input
          ref={nameInputRef}
          id="student-name"
          type="text"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="student-email" className="mb-1 block text-sm font-extrabold text-foreground">
          Correo
        </label>
        <input
          id="student-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`w-full rounded-2xl border-2 bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent ${
            formErrorField === "email" ? "border-danger" : "border-border"
          }`}
          autoComplete="off"
          inputMode="email"
        />
        {formErrorField === "email" && (
          <p role="alert" className="mt-1 text-xs font-bold text-danger">
            {formError}
          </p>
        )}
        {formErrorField !== "email" && email.length > 0 && !emailValid && (
          <p role="alert" className="mt-1 text-xs font-bold text-danger">
            Correo con formato inválido.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="student-document" className="mb-1 block text-sm font-extrabold text-foreground">
          Documento
        </label>
        <input
          id="student-document"
          type="text"
          required
          value={documentValue}
          onChange={(e) => setDocumentValue(e.target.value)}
          onBlur={() => setDocumentTouched(true)}
          className={`w-full rounded-2xl border-2 bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent ${
            formErrorField === "document" ? "border-danger" : "border-border"
          }`}
          autoComplete="off"
        />
        {formErrorField === "document" && (
          <p role="alert" className="mt-1 text-xs font-bold text-danger">
            {formError}
          </p>
        )}
        {formErrorField !== "document" && documentTouched && documentValue.length > 0 && documentValid && (
          <p className="mt-1 text-xs font-bold text-foreground-muted">
            Se guardará como: <span className="font-mono">{normalizedDocument}</span>
          </p>
        )}
        {formErrorField !== "document" && documentTouched && documentValue.length > 0 && !documentValid && (
          <p role="alert" className="mt-1 text-xs font-bold text-danger">
            Debe quedar con 5 a 15 caracteres A-Z0-9 (quedaría: {normalizedDocument || "—"}).
          </p>
        )}
      </div>

      <div>
        <label htmlFor="student-course" className="mb-1 block text-sm font-extrabold text-foreground">
          Curso
        </label>
        <select
          id="student-course"
          required
          value={courseId}
          onChange={(e) => onCourseChange(e.target.value)}
          disabled={coursesLoading || courses.length === 0}
          className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
        >
          {coursesLoading && <option value="">Cargando cursos...</option>}
          {!coursesLoading && courses.length === 0 && <option value="">Sin cursos activos</option>}
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {coursesError && (
          <p role="alert" className="mt-1 text-xs font-bold text-danger">
            {coursesError}
          </p>
        )}
      </div>

      {formErrorField === null && (formError || (submitting && coldStart)) && (
        <p role="alert" className="text-sm font-bold text-danger">
          {formError}
          {submitting && coldStart && " El servidor está despertando, puede tardar unos segundos."}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="btn-3d flex w-full items-center justify-center gap-2 disabled:opacity-50"
      >
        {submitting ? (coldStart ? "El servidor está despertando..." : "Registrando...") : "Registrar estudiante"}
      </button>
    </form>
  );
}

interface StudentsListProps {
  courseName: string;
  students: AdminStudentDto[];
  total: number;
  loading: boolean;
  error: string | null;
  coldStart: boolean;
  onRetry: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  hasCourse: boolean;
}

function StudentsList({
  courseName,
  students,
  total,
  loading,
  error,
  coldStart,
  onRetry,
  search,
  onSearchChange,
  hasCourse,
}: StudentsListProps) {
  return (
    <section className="card-hard flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="truncate text-lg font-extrabold text-foreground">{courseName || "Estudiantes"}</h2>
        {hasCourse && !loading && !error && (
          <p className="text-sm font-bold text-foreground-muted">
            <CountUp value={total} duration={0.6} /> {total === 1 ? "estudiante registrado" : "estudiantes registrados"}
          </p>
        )}
      </div>

      {hasCourse && (
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nombre, correo o documento"
          aria-label="Buscar estudiante registrado"
          className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-accent"
        />
      )}

      {!hasCourse && (
        <p className="py-6 text-center font-bold text-foreground-muted">
          Selecciona un curso para ver sus estudiantes registrados.
        </p>
      )}

      {hasCourse && loading && (
        <div className="flex flex-col items-center gap-2 py-8">
          <Mascot who="gali" mood="running" size={80} />
          <p className="font-bold text-foreground-muted">Cargando estudiantes...</p>
          {coldStart && (
            <p className="text-center text-xs font-semibold text-foreground-muted">
              El servidor está despertando, puede tardar unos segundos.
            </p>
          )}
        </div>
      )}

      {hasCourse && !loading && error && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Mascot who="duo" mood="sad" size={70} />
          <p role="alert" className="font-bold text-foreground">
            {error}
          </p>
          <button type="button" onClick={onRetry} className="btn-3d px-5 py-2 text-xs">
            Reintentar
          </button>
        </div>
      )}

      {hasCourse && !loading && !error && students.length === 0 && (
        <p className="py-6 text-center font-bold text-foreground-muted">
          {search
            ? "Ningún estudiante coincide con la búsqueda."
            : "Este curso aún no tiene estudiantes registrados."}
        </p>
      )}

      {hasCourse && !loading && !error && students.length > 0 && (
        <ul className="space-y-2.5">
          {students.map((s) => (
            <li key={s.id} className="card-hard flex flex-col gap-1 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-extrabold text-foreground">{s.name}</span>
                {s.mustChangePassword && <span className="badge-status badge-status--y">Clave pendiente de cambio</span>}
              </div>
              <div className="text-xs font-semibold text-foreground-muted">
                {s.email} · {s.document}
              </div>
              <div className="text-xs font-semibold text-foreground-muted">Registrado: {formatCreatedAt(s.createdAt)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EstudiantesBody() {
  const [courses, setCourses] = useState<AdminCourseDto[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState("");

  const [students, setStudents] = useState<AdminStudentDto[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [studentsColdStart, setStudentsColdStart] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [search, setSearch] = useState("");

  // Cambiar de curso o forzar una recarga son eventos (selección manual, alta
  // exitosa, reintento): el estado de carga se resetea aquí, no de forma
  // síncrona dentro del efecto que dispara el fetch.
  function selectCourse(id: string) {
    setStudentsLoading(true);
    setStudentsError(null);
    setStudentsColdStart(false);
    setCourseId(id);
  }

  function refreshStudents() {
    setStudentsLoading(true);
    setStudentsError(null);
    setStudentsColdStart(false);
    setRefreshTick((t) => t + 1);
  }

  useEffect(() => {
    let active = true;
    api
      .adminCourses()
      .then((list) => {
        if (!active) return;
        const activeCourses = list.filter((c) => c.active);
        setCourses(activeCourses);
        const first = activeCourses[0]?.id ?? "";
        if (first) selectCourse(first);
      })
      .catch(() => {
        if (active) setCoursesError("No se pudieron cargar los cursos.");
      })
      .finally(() => {
        if (active) setCoursesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // Sin curso seleccionado (p. ej. mientras cargan los cursos, o sin cursos activos)
    // no hay nada que pedir: los estados iniciales (lista vacía, sin error) ya sirven.
    if (!courseId) return;
    let active = true;
    const coldTimer = setTimeout(() => {
      if (active) setStudentsColdStart(true);
    }, COLD_START_MS);

    api
      .listStudents(courseId)
      .then((list) => {
        if (active) setStudents(list);
      })
      .catch((err) => {
        if (active) {
          setStudentsError(err instanceof ApiError ? err.message : "No se pudo cargar la lista de estudiantes.");
        }
      })
      .finally(() => {
        if (active) {
          setStudentsLoading(false);
          setStudentsColdStart(false);
        }
        clearTimeout(coldTimer);
      });

    return () => {
      active = false;
      clearTimeout(coldTimer);
    };
  }, [courseId, refreshTick]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.document.toLowerCase().includes(q)
    );
  }, [students, search]);

  const selectedCourseName = courses.find((c) => c.id === courseId)?.name ?? "";

  return (
    <main className="flex flex-1 flex-col px-4 py-6 pb-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <Link href="/coordinacion" className="text-sm font-bold text-primary">
          ← Volver a coordinación
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start">
          <RegisterForm
            courses={courses}
            coursesLoading={coursesLoading}
            coursesError={coursesError}
            courseId={courseId}
            onCourseChange={selectCourse}
            onCreated={refreshStudents}
          />

          <StudentsList
            courseName={selectedCourseName}
            students={filteredStudents}
            total={students.length}
            loading={studentsLoading}
            error={studentsError}
            coldStart={studentsColdStart}
            onRetry={refreshStudents}
            search={search}
            onSearchChange={setSearch}
            hasCourse={Boolean(courseId)}
          />
        </div>
      </div>
    </main>
  );
}

export default function EstudiantesPage() {
  return (
    <RouteGuard allow={["coordinacion"]}>
      <AppHeader title="Registrar estudiantes" />
      <EstudiantesBody />
    </RouteGuard>
  );
}
