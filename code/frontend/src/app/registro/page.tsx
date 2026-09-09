"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, type Course } from "@/lib/api";
import { PublicNavbar } from "@/components/PublicNavbar";

export default function RegistroPage() {
  const { setSession } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [courseId, setCourseId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .courses()
      .then((list) => {
        setCourses(list);
        setCourseId((current) => current || (list[0]?._id ?? ""));
      })
      .catch(() => setError("No se pudieron cargar los cursos"));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { token, user } = await api.signupEstudiante({ name, email, password, courseId, code });
      setSession(token, user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo completar el registro");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PublicNavbar />
      <main className="flex flex-1 flex-col items-center px-4 py-10">
        <div className="grid w-full max-w-3xl items-end gap-6 sm:grid-cols-[190px_1fr]">
          <div className="order-first hidden justify-center sm:order-none sm:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/personajes/diego-t.png"
              alt="Diego mostrando su carné con código QR"
              className="animate-float h-72 w-auto max-w-none"
            />
          </div>

          <div className="card-hard w-full max-w-sm justify-self-center p-6 sm:justify-self-start sm:p-8">
            <h1 className="mb-1 text-center text-2xl font-black tracking-tight text-foreground">
              Soy estudiante
            </h1>
            <p className="mb-7 text-center text-sm font-semibold text-foreground-muted">
              Crea tu cuenta con el código de invitación de tu curso
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-extrabold text-foreground">Nombre completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
                  autoComplete="name"
                />
              </div>

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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-extrabold text-foreground">Curso</label>
                <select
                  required
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
                >
                  {courses.length === 0 && <option value="">Cargando cursos...</option>}
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-extrabold text-foreground">
                  Código de invitación
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
                  placeholder="Te lo entrega el colegio"
                />
              </div>

              {error && <p className="text-sm font-bold text-danger">{error}</p>}

              <button
                type="submit"
                disabled={submitting || !courseId}
                className="btn-3d w-full disabled:opacity-50"
              >
                {submitting ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
