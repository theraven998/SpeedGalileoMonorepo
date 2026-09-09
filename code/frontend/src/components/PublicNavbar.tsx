"use client";

import { useState } from "react";
import Link from "next/link";

export function PublicNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b-2 border-border bg-surface">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-black tracking-tight text-primary"
          onClick={() => setOpen(false)}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background-alt">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/personajes/cara-gali.png"
              alt=""
              className="h-full w-full scale-125 object-cover object-[50%_30%]"
            />
          </span>
          SpeedGalileo
        </Link>

        <div className="hidden items-center gap-3 sm:flex">
          <Link href="/registro" className="btn-3d btn-3d-outline px-5 py-2.5 text-xs">
            Soy estudiante
          </Link>
          <Link href="/login" className="btn-3d px-5 py-2.5 text-xs">
            Iniciar sesión
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-border text-lg font-bold text-foreground sm:hidden"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <div className="border-t-2 border-border bg-surface px-4 py-4 sm:hidden">
          <div className="flex flex-col gap-3">
            <Link
              href="/registro"
              onClick={() => setOpen(false)}
              className="btn-3d btn-3d-outline w-full py-3 text-center text-xs"
            >
              Soy estudiante
            </Link>
            <Link href="/login" onClick={() => setOpen(false)} className="btn-3d w-full py-3 text-center text-xs">
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
