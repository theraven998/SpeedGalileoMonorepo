"use client";

import { useEffect, useState } from "react";
import { EARLY_CUTOFF_MIN, LATE_CUTOFF_MIN, getBogotaNow, type BogotaNow } from "./bogotaTime";

interface Band {
  text: string;
  cls: string;
}

function bandFor(minutesOfDay: number): Band {
  if (minutesOfDay < EARLY_CUTOFF_MIN) {
    return { text: "Temprano hasta 07:20", cls: "border-verde bg-[#e7f9d8] text-verde-oscuro" };
  }
  if (minutesOfDay <= LATE_CUTOFF_MIN) {
    return { text: "A tiempo hasta 07:30", cls: "border-amarillo bg-[#fff3d1] text-amarillo-oscuro" };
  }
  return { text: "Portería cerrada", cls: "border-rojo bg-[#ffe3e3] text-rojo-oscuro" };
}

export function ClockBanner() {
  const [now, setNow] = useState<BogotaNow>(() => getBogotaNow());

  useEffect(() => {
    const id = setInterval(() => setNow(getBogotaNow()), 1000);
    return () => clearInterval(id);
  }, []);

  const band = bandFor(now.minutesOfDay);

  return (
    <div className="card-hard flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-3xl font-black tabular-nums tracking-tight text-foreground">{now.label}</span>
      <span className={`badge-status border-2 transition-colors duration-500 ${band.cls}`}>{band.text}</span>
    </div>
  );
}
