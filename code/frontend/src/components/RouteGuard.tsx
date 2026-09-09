"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/api";

export function RouteGuard({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !allow.includes(user.role))) {
      router.replace("/login");
    }
  }, [loading, user, allow, router]);

  if (loading || !user || !allow.includes(user.role)) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="font-bold text-foreground-muted">Cargando...</p>
      </main>
    );
  }

  return <>{children}</>;
}
