"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { RouteGuard } from "@/components/RouteGuard";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, ROLE_HOME, type Role } from "@/lib/api";
import { HAPTIC, Mascot, cannons, playError, playLevelUp, vibrate } from "@/components/fx";

const ROLE_LABEL: Record<Role, string> = {
  profesor: "Profesor",
  coordinacion: "Coordinación",
  estudiante: "Estudiante",
};

type ErrorField = "current" | "new" | null;

function PerfilBody() {
  const { user, updateUser, logout } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<ErrorField>(null);
  const [errorTick, setErrorTick] = useState(0);

  if (!user) return null;
  const currentUser = user;

  const newPasswordValid = newPassword.length >= 8;
  const confirmValid = confirmPassword.length > 0 && confirmPassword === newPassword;
  const canSubmit = currentPassword.length > 0 && newPasswordValid && confirmValid && !submitting && !success;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setErrorField(null);
    setSubmitting(true);

    try {
      await api.changeMyPassword({ currentPassword, newPassword });
      updateUser({ mustChangePassword: false });
      setSuccess(true);
      playLevelUp();
      cannons();
      vibrate([...HAPTIC.success]);
      const roleHome = ROLE_HOME[currentUser.role];
      setTimeout(() => {
        router.push(roleHome);
      }, 1200);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setErrorField(err.status === 401 ? "current" : "new");
      } else {
        setError("No se pudo cambiar la contraseña. Intenta de nuevo.");
      }
      setErrorTick((t) => t + 1);
      playError();
      vibrate([...HAPTIC.fail]);
    } finally {
      setSubmitting(false);
    }
  }

  const fieldType = showPasswords ? "text" : "password";

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8">
      <div className="w-full max-w-md">
        <section className="card-hard flex items-center gap-4 p-5">
          <Mascot who="gali" mood={success ? "cheer" : "idle"} size={64} />
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-foreground">{user.name}</p>
            <p className="truncate text-sm font-semibold text-foreground-muted">{user.email}</p>
            <span className="badge-status badge-status--y mt-1 inline-block">{ROLE_LABEL[user.role]}</span>
          </div>
        </section>

        {user.mustChangePassword && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border-2 border-amarillo bg-[#fff3d1] px-4 py-3 text-sm font-bold text-[#5c4500]"
          >
            Por seguridad, cambia la contraseña temporal antes de continuar.
          </div>
        )}

        <motion.form
          key={`pw-${errorTick}`}
          onSubmit={handleSubmit}
          className={`card-hard mt-4 space-y-4 p-6 ${errorTick > 0 ? "animate-shake-hard" : ""}`}
        >
          <h2 className="text-lg font-extrabold text-foreground">Cambiar contraseña</h2>

          <div>
            <label htmlFor="currentPassword" className="mb-1 block text-sm font-extrabold text-foreground">
              Contraseña actual
            </label>
            <input
              id="currentPassword"
              type={fieldType}
              required
              autoFocus
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={`w-full rounded-2xl border-2 bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent ${
                errorField === "current" ? "border-danger" : "border-border"
              }`}
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="mb-1 block text-sm font-extrabold text-foreground">
              Nueva contraseña
            </label>
            <input
              id="newPassword"
              type={fieldType}
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`w-full rounded-2xl border-2 bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent ${
                errorField === "new" ? "border-danger" : "border-border"
              }`}
            />
            {newPassword.length > 0 && !newPasswordValid && (
              <p className="mt-1 text-xs font-bold text-danger">Debe tener mínimo 8 caracteres.</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-extrabold text-foreground">
              Confirmar nueva contraseña
            </label>
            <input
              id="confirmPassword"
              type={fieldType}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-accent"
            />
            {confirmPassword.length > 0 && !confirmValid && (
              <p className="mt-1 text-xs font-bold text-danger">Las contraseñas no coinciden.</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-foreground-muted">
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
              className="h-4 w-4"
            />
            Mostrar contraseñas
          </label>

          <p aria-live="polite" className="min-h-5 text-sm font-bold text-danger">
            {error}
          </p>
          {success && <p className="text-sm font-bold text-success">¡Contraseña actualizada! Redirigiendo...</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-3d flex w-full items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? "Guardando..." : success ? "¡Listo!" : "Cambiar contraseña"}
          </button>
        </motion.form>

        <button
          type="button"
          onClick={logout}
          className="btn-3d btn-3d-outline mt-4 w-full px-5 py-3 text-xs"
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  );
}

export default function PerfilPage() {
  return (
    <RouteGuard allow={["profesor", "coordinacion", "estudiante"]}>
      <AppHeader title="Mi perfil" />
      <PerfilBody />
    </RouteGuard>
  );
}
