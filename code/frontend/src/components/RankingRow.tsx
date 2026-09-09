import type { RankingEntry } from "@/lib/api";

const MEDALS = ["🥇", "🥈", "🥉"];
const AVATAR_TONES = ["bg-azul", "bg-morado", "bg-naranja"];
/** Puntaje máximo posible por registro (ver code/backend/src/utils/attendanceRules.ts): antes de 7:20 = 3 pts. */
const MAX_POINTS = 3;

function courseInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }
  return (name.slice(0, 3) || "?").toUpperCase();
}

export function RankingRow({
  entry,
  position,
  size = "md",
}: {
  entry: RankingEntry;
  position: number;
  size?: "md" | "lg";
}) {
  const isFirst = position === 0;
  const pct = Math.max(4, Math.min(100, Math.round((entry.avgPoints / MAX_POINTS) * 100)));

  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 ${
        isFirst ? "border-amarillo bg-[#fffaeb]" : "border-border bg-surface"
      } ${size === "lg" ? "sm:gap-4 sm:px-5 sm:py-4" : ""}`}
    >
      <span className="w-7 shrink-0 text-center text-xl sm:text-2xl" aria-hidden>
        {MEDALS[position] ?? "🎯"}
      </span>
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${AVATAR_TONES[position % AVATAR_TONES.length]}`}
      >
        {courseInitials(entry.courseName)}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[17px] font-extrabold text-foreground">{entry.courseName}</b>
        <small className="block text-xs font-bold text-foreground-muted">
          {entry.registros} {entry.registros === 1 ? "registro" : "registros"}
        </small>
        <span className="prog-bar mt-1.5 block h-2 max-w-[230px] overflow-hidden rounded-full bg-border">
          <i className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </span>
      </span>
      <span
        className={`whitespace-nowrap text-lg font-black sm:text-xl ${isFirst ? "text-amarillo-oscuro" : "text-primary"}`}
      >
        {entry.avgPoints}
      </span>
    </li>
  );
}
