"use client";

export interface StreakFlameProps {
  streak: number;
  isOff: boolean;
}

/** Racha de puntualidad con llama que crece, o llama apagada si se rompió hoy. */
export function StreakFlame({ streak, isOff }: StreakFlameProps) {
  if (isOff) {
    return (
      <section className="card-hard mx-auto flex w-full max-w-sm items-center gap-3 p-4">
        <span className="text-4xl opacity-60 grayscale" aria-hidden>
          💨
        </span>
        <p className="text-sm font-bold text-foreground-muted">Tu racha se apagó… ¡enciéndela mañana!</p>
      </section>
    );
  }

  if (streak <= 0) return null;

  const size = Math.min(64, 32 + streak * 4);

  return (
    <section className="card-hard mx-auto flex w-full max-w-sm items-center gap-3 p-4">
      <span className="animate-flame" style={{ fontSize: size, lineHeight: 1 }} aria-hidden>
        🔥
      </span>
      <p className="text-sm font-extrabold text-foreground">
        Racha de <span className="text-primary">{streak}</span> {streak === 1 ? "día" : "días"} seguidos
      </p>
    </section>
  );
}
