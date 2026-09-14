"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, type Course } from "@/lib/api";
import { PublicNavbar } from "@/components/PublicNavbar";
import { Mascot, HAPTIC, fireworks, playCoin, playError, playFanfare, vibrate, useReducedMotion } from "@/components/fx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COLD_START_MS = 1500;
const SUCCESS_DELAY_MS = 1400;
const SAD_MOOD_MS = 1600;

interface Validity {
  name: boolean;
  email: boolean;
  password: boolean;
  course: boolean;
  code: boolean;
}

function ValidatedField({ label, valid, children }: { label: string; valid: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-sm font-extrabold text-foreground">
        {label}
        <AnimatePresence>
          {valid && (
            <motion.svg
              key="check"
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="none"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              aria-hidden
            >
              <motion.path
                d="M4,10 L8,14 L16,5"
                stroke="#58cc02"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </label>
      {children}
    </div>
  );
}

export default function RegistroPage() {
  const { setSession } = useAuth();
  const reducedMotion = useReducedMotion();
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [courseId, setCourseId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorTick, setErrorTick] = useState(0);
  const [mascotSad, setMascotSad] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [coldStart, setColdStart] = useState(false);
  const coldStartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api
      .courses()
      .then((list) => {
        setCourses(list);
        setCourseId((current) => current || (list[0]?.id ?? ""));
      })
      .catch(() => setError("No se pudieron cargar los cursos"));
  }, []);

  const validity: Validity = {
    name: name.trim().length > 0,
    email: EMAIL_RE.test(email),
    password: password.length >= 6,
    course: courseId.length > 0,
    code: code.trim().length > 0,
  };
  const fieldKeys = Object.keys(validity) as (keyof Validity)[];
  const validCount = fieldKeys.filter((k) => validity[k]).length;
  const pct = Math.round((validCount / fieldKeys.length) * 100);

  const prevValidity = useRef<Validity>(validity);
  useEffect(() => {
    const prev = prevValidity.current;
    const justCompleted = fieldKeys.some((k) => validity[k] && !prev[k]);
    if (justCompleted) playCoin();
    prevValidity.current = validity;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validCount]);

  useEffect(() => {
    if (!mascotSad) return;
    const t = setTimeout(() => setMascotSad(false), SAD_MOOD_MS);
    return () => clearTimeout(t);
  }, [mascotSad]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setColdStart(false);
    coldStartTimer.current = setTimeout(() => setColdStart(true), COLD_START_MS);
    try {
      const { token, user } = await api.signupEstudiante({ name, email, password, courseId, code });
      setSuccess(true);
      playFanfare();
      fireworks(1200);
      vibrate([...HAPTIC.success]);
      setTimeout(() => setSession(token, user), SUCCESS_DELAY_MS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo completar el registro");
      setErrorTick((t) => t + 1);
      setMascotSad(true);
      playError();
      vibrate([...HAPTIC.fail]);
    } finally {
      if (coldStartTimer.current) clearTimeout(coldStartTimer.current);
      setColdStart(false);
      setSubmitting(false);
    }
  }

  const mascotMood = success ? "cheer" : mascotSad ? "sad" : submitting ? "running" : "idle";

  return (
    <>
      <PublicNavbar />
      <main className="flex flex-1 flex-col items-center px-4 py-10">
        <div className="grid w-full max-w-3xl items-end gap-6 sm:grid-cols-[190px_1fr]">
          <div className="order-first hidden justify-center sm:order-none sm:flex">
            <Mascot who="diego" mood={mascotMood} size={180} />
          </div>

          <motion.div
            key={`form-${errorTick}`}
            className={`card-hard w-full max-w-sm justify-self-center p-6 sm:justify-self-start sm:p-8 ${
              errorTick > 0 ? "animate-shake-hard" : ""
            }`}
          >
            <h1 className="mb-1 text-center text-2xl font-black tracking-tight text-foreground">Soy estudiante</h1>
            <p className="mb-4 text-center text-sm font-semibold text-foreground-muted">
              Crea tu cuenta con el código de invitación de tu curso
            </p>

            <div className="prog-bar mb-6 h-3 overflow-hidden rounded-full bg-border">
              <motion.i
                className="block h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
              />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <ValidatedField label="Nombre completo" valid={validity.name}>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
                  autoComplete="name"
                />
              </ValidatedField>

              <ValidatedField label="Correo" valid={validity.email}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
                  autoComplete="email"
                  inputMode="email"
                />
              </ValidatedField>

              <ValidatedField label="Contraseña" valid={validity.password}>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
                  autoComplete="new-password"
                />
              </ValidatedField>

              <ValidatedField label="Curso" valid={validity.course}>
                <select
                  required
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
                >
                  {courses.length === 0 && <option value="">Cargando cursos...</option>}
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </ValidatedField>

              <ValidatedField label="Código de invitación" valid={validity.code}>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
                  placeholder="Te lo entrega el colegio"
                />
              </ValidatedField>

              {error && <p className="text-sm font-bold text-danger">{error}</p>}

              <button
                type="submit"
                disabled={submitting || !courseId || success}
                className="btn-3d flex w-full items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Mascot who="diego" mood="running" size={26} />
                    {coldStart ? "El servidor está despertando..." : "Creando cuenta..."}
                  </>
                ) : success ? (
                  "¡Listo!"
                ) : (
                  "Crear cuenta"
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </main>

      <AnimatePresence>
        {success && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[999] flex items-center justify-center bg-verde/15 px-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.15 : 0.25 }}
          >
            <motion.div
              className="rounded-3xl bg-verde px-8 py-6 text-white shadow-xl"
              initial={reducedMotion ? { opacity: 0 } : { scale: 0.6, opacity: 0, y: 20 }}
              animate={reducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
              transition={reducedMotion ? { duration: 0.15 } : { type: "spring", bounce: 0.5, duration: 0.6 }}
            >
              <Mascot who="diego" mood="cheer" size={110} />
              <p className="animate-shine mt-2 text-2xl font-black">¡Bienvenido al equipo!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
