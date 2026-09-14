"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { RevealGroup, RevealItem, playTap } from "@/components/fx";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/api";
import { formatBogotaDate, formatBogotaTime } from "./gamification";

const NODE_STYLE: Record<AttendanceStatus, { ring: string; icon: string }> = {
  temprano: { ring: "border-verde bg-verde", icon: "👑" },
  a_tiempo: { ring: "border-amarillo bg-amarillo", icon: "⭐" },
  tarde: { ring: "border-rojo bg-rojo", icon: "💧" },
};

export interface AttendancePathProps {
  records: AttendanceRecord[];
}

/** Historial como camino estilo Duolingo: nodos en zigzag, tarjeta al tocar. */
export function AttendancePath({ records }: AttendancePathProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (records.length === 0) {
    return (
      <section className="card-hard mx-auto w-full max-w-sm p-5 text-center">
        <p className="text-sm font-bold text-foreground-muted">Sin registros aún. ¡Escanea tu QR en portería!</p>
      </section>
    );
  }

  const sorted = [...records].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));

  return (
    <RevealGroup className="mx-auto flex w-full max-w-sm flex-col items-center" staggerDelay={0.07}>
      {sorted.map((r, i) => {
        const open = openId === r._id;
        const alignClass = i % 2 === 0 ? "self-end mr-6 sm:mr-12" : "self-start ml-6 sm:ml-12";
        const style = NODE_STYLE[r.status];

        return (
          <RevealItem key={r._id} className={`relative flex flex-col items-center ${alignClass}`}>
            {i > 0 && <span className="h-6 w-1 rounded-full bg-border" aria-hidden />}
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => {
                playTap();
                setOpenId(open ? null : r._id);
              }}
              aria-expanded={open}
              aria-label={`${formatBogotaDate(r.day)}: ${r.status}`}
              className={`flex h-14 w-14 items-center justify-center rounded-full border-4 text-2xl text-white shadow-md ${
                r.justified ? "border-dashed border-border bg-background-alt text-foreground-muted" : `${style.ring}`
              }`}
            >
              {r.justified ? "✓" : style.icon}
            </motion.button>

            {open && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="card-hard mt-2 w-56 p-3 text-left text-xs"
              >
                <p className="font-extrabold capitalize text-foreground">{formatBogotaDate(r.day)}</p>
                <p className="text-foreground-muted">{formatBogotaTime(r.scannedAt)}</p>
                <p className="mt-1 font-bold text-foreground">
                  {r.points} pts{r.minutesLate > 0 ? ` · -${r.minutesLate} min de clase` : ""}
                </p>
                {r.justified && <p className="mt-1 font-bold text-azul">Justificado</p>}
              </motion.div>
            )}
          </RevealItem>
        );
      })}
    </RevealGroup>
  );
}
