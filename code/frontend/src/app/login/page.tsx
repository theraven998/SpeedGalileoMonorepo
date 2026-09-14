"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { PublicNavbar } from "@/components/PublicNavbar";
import { Mascot, HAPTIC, playError, playLevelUp, cannons, vibrate, useReducedMotion } from "@/components/fx";

type Field = "email" | "password" | null;

const COLD_START_MS = 1500;
const SUCCESS_DELAY_MS = 850;

export default function LoginPage() {
  const { setSession } = useAuth();
  const reducedMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorTick, setErrorTick] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [coldStart, setColdStart] = useState(false);
  const [focused, setFocused] = useState<Field>(null);
  const coldStartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (coldStartTimer.current) clearTimeout(coldStartTimer.current);
    },
    []
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setColdStart(false);
    coldStartTimer.current = setTimeout(() => setColdStart(true), COLD_START_MS);

    try {
      const { token, user } = await api.login(email, password);
      setSuccess(true);
      playLevelUp();
      cannons();
      vibrate([...HAPTIC.success]);
      setTimeout(() => setSession(token, user), SUCCESS_DELAY_MS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión");
      setErrorTick((t) => t + 1);
      playError();
      vibrate([...HAPTIC.fail]);
    } finally {
      if (coldStartTimer.current) clearTimeout(coldStartTimer.current);
      setColdStart(false);
      setSubmitting(false);
    }
  }

  const mascotMood = success ? "cheer" : error ? "shocked" : submitting ? "running" : "idle";
  const tilt = reducedMotion ? 0 : focused === "email" ? -6 : focused === "password" ? 5 : 0;

  return (
    <>
      <PublicNavbar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-3xl items-center gap-4 sm:grid-cols-[190px_1fr] sm:gap-8">
          <div className="order-first flex justify-center sm:order-none">
            <motion.div
              className="relative"
              animate={{ rotate: tilt }}
              transition={{ type: "spring", stiffness: 160, damping: 12 }}
            >
              <Mascot who="gali" mood={mascotMood} size={180} />
              <AnimatePresence>
                {focused === "password" && !success && (
                  <motion.span
                    key="peek"
                    className="pointer-events-none absolute left-1/2 top-[6%] select-none text-5xl"
                    // x en style: motion reescribe transform y anularía la clase -translate-x-1/2
                    style={{ x: "-58%" }}
                    initial={reducedMotion ? { opacity: 0 } : { y: -30, opacity: 0, scale: 0.6 }}
                    animate={reducedMotion ? { opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
                    exit={reducedMotion ? { opacity: 0 } : { y: -30, opacity: 0, scale: 0.6 }}
                    transition={
                      reducedMotion ? { duration: 0.15 } : { type: "spring", stiffness: 300, damping: 16 }
                    }
                    aria-hidden
                  >
                    🙈
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <motion.div
            key={`form-${errorTick}`}
            className={`card-hard w-full max-w-sm justify-self-center p-6 sm:justify-self-start sm:p-8 ${
              errorTick > 0 ? "animate-shake-hard" : ""
            }`}
          >
            <h1 className="mb-1 text-center text-2xl font-black tracking-tight text-foreground">
              SpeedGalileo
            </h1>
            <p className="mb-7 text-center text-sm font-semibold text-foreground-muted">
              Registro de puntualidad · Gimnasio Galileo Galilei
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-extrabold text-foreground">Correo</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused((f) => (f === "email" ? null : f))}
                  className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
                  autoComplete="email"
                  inputMode="email"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-extrabold text-foreground">Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused((f) => (f === "password" ? null : f))}
                  className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
                  autoComplete="current-password"
                />
              </div>

              {error && <p className="text-sm font-bold text-danger">{error}</p>}

              <button
                type="submit"
                disabled={submitting || success}
                className="btn-3d flex w-full items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Mascot who="gali" mood="running" size={26} />
                    {coldStart ? "El servidor está despertando..." : "Ingresando..."}
                  </>
                ) : success ? (
                  "¡Listo!"
                ) : (
                  "Ingresar"
                )}
              </button>
            </form>

            <div className="mt-6 flex justify-center gap-5 text-sm font-bold">
              <Link href="/registro" className="text-primary">
                Soy estudiante
              </Link>
              <Link href="/ranking" className="text-primary">
                Ver ranking
              </Link>
            </div>
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
              <Mascot who="gali" mood="cheer" size={100} />
              <p className="animate-shine mt-2 text-2xl font-black">¡Bienvenido de vuelta!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
