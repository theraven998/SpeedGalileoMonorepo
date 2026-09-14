"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/lib/auth-context";
import { SoundToggle, useReducedMotion } from "@/components/fx";

export function AppHeader({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const reducedMotion = useReducedMotion();

  return (
    <header className="sticky top-0 z-20 border-b-2 border-border bg-surface">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <Link
            href="/ranking"
            className="group flex items-center gap-2 text-base font-black tracking-tight text-primary"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background-alt">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/personajes/cara-gali.png"
                alt=""
                className="h-full w-full scale-125 object-cover object-[50%_30%] group-hover:animate-wiggle"
              />
            </span>
            SpeedGalileo
          </Link>
          {reducedMotion ? (
            <h1 className="mt-0.5 truncate text-lg font-extrabold leading-tight text-foreground">{title}</h1>
          ) : (
            <motion.h1
              key={title}
              className="mt-0.5 truncate text-lg font-extrabold leading-tight text-foreground"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {title}
            </motion.h1>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SoundToggle />
          {user && (
            <motion.button
              type="button"
              onClick={logout}
              whileTap={{ scale: 0.94 }}
              className="btn-3d btn-3d-outline rounded-2xl px-4 py-2 text-xs"
            >
              Salir
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
}
