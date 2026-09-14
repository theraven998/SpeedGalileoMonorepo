"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/api";
import { Mascot, useReducedMotion } from "@/components/fx";

function LoadingDots() {
  const reducedMotion = useReducedMotion();
  return (
    <span className="inline-flex gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-primary"
          animate={reducedMotion ? {} : { y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

export function RouteGuard({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Regla 3 del contrato: clave temporal pendiente de cambio fuerza /perfil,
  // salvo que ya estemos ahí (si no, nunca se podría llegar a cambiarla).
  const mustChangePassword = Boolean(user?.mustChangePassword) && pathname !== "/perfil";

  useEffect(() => {
    if (loading) return;
    if (!user || !allow.includes(user.role)) {
      router.replace("/login");
      return;
    }
    if (mustChangePassword) {
      router.replace("/perfil");
    }
  }, [loading, user, allow, router, mustChangePassword]);

  if (loading || !user || !allow.includes(user.role) || mustChangePassword) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <Mascot who="gali" mood="running" size={110} />
        <p className="flex items-center gap-2 font-bold text-foreground-muted">
          Verificando sesión
          <LoadingDots />
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
