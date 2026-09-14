"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cannons } from "@/components/fx";
import type { Badge } from "./gamification";

const SEEN_KEY = "sg-badges";

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
  } catch {
    // almacenamiento no disponible: ignorar
  }
}

export interface BadgesProps {
  badges: Badge[];
}

/** Grid de logros bloqueados/desbloqueados, con toast + confeti al desbloquear uno nuevo. */
export function Badges({ badges }: BadgesProps) {
  const [toast, setToast] = useState<Badge | null>(null);
  const [wigglingId, setWigglingId] = useState<string | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const seen = readSeen();
    const unlockedIds = badges.filter((b) => b.unlocked).map((b) => b.id);
    const fresh = badges.find((b) => b.unlocked && !seen.includes(b.id));
    writeSeen([...new Set([...seen, ...unlockedIds])]);

    if (fresh) {
      // Lectura única de localStorage tras montar: no hay forma de sincronizar esto durante el render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToast(fresh);
      cannons();
      const timer = setTimeout(() => setToast(null), 2800);
      return () => clearTimeout(timer);
    }
  }, [badges]);

  return (
    <section className="mx-auto w-full max-w-sm">
      <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-foreground-muted">Insignias</h2>
      <ul className="grid grid-cols-3 gap-3">
        {badges.map((b) => (
          <li key={b.id} className="flex flex-col items-center gap-1">
            <button
              type="button"
              disabled={!b.unlocked}
              onClick={() => setWigglingId(b.id)}
              onAnimationEnd={() => setWigglingId((id) => (id === b.id ? null : id))}
              aria-label={`${b.label}${b.unlocked ? "" : " (bloqueada)"}`}
              className={`flex h-16 w-16 items-center justify-center rounded-full border-2 text-2xl ${
                b.unlocked
                  ? `animate-shine border-amarillo bg-[#fffaeb] ${wigglingId === b.id ? "animate-wiggle" : ""}`
                  : "cursor-not-allowed border-border bg-background-alt text-foreground-muted grayscale opacity-60"
              }`}
            >
              {b.unlocked ? b.icon : "🔒"}
            </button>
            <span className="text-center text-[10px] font-bold leading-tight text-foreground-muted">{b.label}</span>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed inset-x-4 bottom-6 z-[900] mx-auto flex max-w-sm items-center gap-3 rounded-2xl border-2 border-amarillo bg-[#fffaeb] p-4 shadow-lg"
          >
            <span className="text-3xl" aria-hidden>
              {toast.icon}
            </span>
            <div>
              <p className="text-sm font-black text-amarillo-oscuro">¡Nueva insignia!</p>
              <p className="text-xs font-bold text-foreground-muted">{toast.label}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
