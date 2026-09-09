"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { PublicNavbar } from "@/components/PublicNavbar";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PublicNavbar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-3xl items-center gap-8 sm:grid-cols-[190px_1fr]">
          <div className="order-first hidden justify-center sm:order-none sm:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/personajes/galileo-t.png"
              alt="Gali dándote la bienvenida"
              className="animate-float h-72 w-auto max-w-none"
            />
          </div>

          <div className="card-hard w-full max-w-sm justify-self-center p-6 sm:justify-self-start sm:p-8">
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
                  className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
                  autoComplete="current-password"
                />
              </div>

              {error && <p className="text-sm font-bold text-danger">{error}</p>}

              <button type="submit" disabled={submitting} className="btn-3d w-full disabled:opacity-50">
                {submitting ? "Ingresando..." : "Ingresar"}
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
          </div>
        </div>
      </main>
    </>
  );
}
