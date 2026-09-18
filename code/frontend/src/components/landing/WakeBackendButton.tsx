"use client";

import { useState } from "react";
import { api } from "@/lib/api";

type WakeState = "idle" | "waking" | "ok" | "error";

const LABEL: Record<WakeState, string> = {
  idle: "Despertar servidor",
  waking: "Despertando… (hasta 1 min)",
  ok: "Servidor listo ✅",
  error: "No respondió, reintentar",
};

// Temporal: Render free se duerme; esto hace un /health para que portería no espere en el primer escaneo.
export function WakeBackendButton() {
  const [state, setState] = useState<WakeState>("idle");

  async function wake() {
    setState("waking");
    try {
      await api.health();
      setState("ok");
    } catch {
      setState("error");
    }
  }

  return (
    <button
      type="button"
      onClick={wake}
      disabled={state === "waking"}
      className={`fixed bottom-4 right-4 z-50 rounded-2xl border-2 px-4 py-3 text-sm font-black shadow-lg disabled:opacity-80 ${
        state === "ok"
          ? "border-verde bg-[#e7f9d8] text-verde-oscuro"
          : state === "error"
            ? "border-rojo bg-[#ffe3e3] text-rojo-oscuro"
            : "border-amarillo bg-[#fff3d1] text-amarillo-oscuro"
      }`}
    >
      {LABEL[state]}
    </button>
  );
}
