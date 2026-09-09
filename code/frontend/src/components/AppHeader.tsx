"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function AppHeader({ title }: { title: string }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b-2 border-border bg-surface">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <Link href="/ranking" className="flex items-center gap-2 text-base font-black tracking-tight text-primary">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background-alt">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/personajes/cara-gali.png"
                alt=""
                className="h-full w-full scale-125 object-cover object-[50%_30%]"
              />
            </span>
            SpeedGalileo
          </Link>
          <h1 className="mt-0.5 truncate text-lg font-extrabold leading-tight text-foreground">{title}</h1>
        </div>
        {user && (
          <button
            type="button"
            onClick={logout}
            className="btn-3d btn-3d-outline shrink-0 rounded-2xl px-4 py-2 text-xs"
          >
            Salir
          </button>
        )}
      </div>
    </header>
  );
}
