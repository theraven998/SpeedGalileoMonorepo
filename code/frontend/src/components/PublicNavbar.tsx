"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { playTap, SoundToggle } from "@/components/fx";

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-20 border-b-2 border-border bg-surface transition-shadow duration-200 ${
        scrolled ? "shadow-[0_4px_14px_rgba(0,0,0,0.08)]" : ""
      }`}
    >
      <div
        className={`flex items-center justify-between gap-4 px-4 transition-[padding] duration-200 sm:px-6 ${
          scrolled ? "py-2" : "py-3"
        }`}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-black tracking-tight text-primary"
          onClick={() => setOpen(false)}
        >
          <motion.span
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background-alt"
            whileHover={{ rotate: [0, -8, 7, -5, 3, 0] }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/personajes/cara-gali.png"
              alt=""
              className="h-full w-full scale-125 object-cover object-[50%_30%]"
            />
          </motion.span>
          SpeedGalileo
        </Link>

        <div className="hidden items-center gap-3 sm:flex">
          <SoundToggle />
          <Link href="/login" className="btn-3d px-5 py-2.5 text-xs" onClick={() => playTap()}>
            Iniciar sesión
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:hidden">
          <SoundToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-border text-lg font-bold text-foreground"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t-2 border-border bg-surface px-4 py-4 sm:hidden">
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              onClick={() => {
                playTap();
                setOpen(false);
              }}
              className="btn-3d w-full py-3 text-center text-xs"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
