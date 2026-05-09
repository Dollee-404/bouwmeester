import { useTranslation } from "react-i18next";

// SVG donut parameters
const SIZE = 88;
const STROKE = 9;
const R = (SIZE - STROKE) / 2;         // 39.5
const C = 2 * Math.PI * R;             // ≈ 248.19
const TEAL = "#006876";
const TRACK = "#e2e8f0";               // slate-200

function Donut({ pct }: { pct: number }) {
  const filled = (Math.min(pct, 100) / 100) * C;
  const hasArc = pct > 0;

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke={TRACK}
          strokeWidth={STROKE}
        />
        {/* Progress arc */}
        {hasArc && (
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none"
            stroke={TEAL}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${C}`}
          />
        )}
      </svg>
      {/* Center percentage — rotated back to upright */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold tabular-nums ${hasArc ? "text-slate-700" : "text-slate-400"}`}>
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}

const UREN_COLOR: Record<"ok" | "warning" | "danger", string> = {
  ok:      "text-slate-500",
  warning: "text-amber-600",
  danger:  "text-red-600",
};

function urenVariant(urenPct: number): "ok" | "warning" | "danger" {
  return urenPct > 100 ? "danger" : urenPct > 85 ? "warning" : "ok";
}

export interface PhaseCardProps {
  name: string;
  progress: number;
  hoursSpent?: number;
  hoursBudget?: number;
}

export function PhaseCard({ name, progress, hoursSpent, hoursBudget }: PhaseCardProps) {
  const { t } = useTranslation();

  const isInactive = progress === 0;
  const hasUren = hoursBudget != null && hoursBudget > 0;
  const spent = hoursSpent ?? 0;
  const urenPct = hasUren ? (spent / hoursBudget!) * 100 : 0;
  const variant = urenVariant(urenPct);

  // ── Hours sub-text ───────────────────────────────────────────────
  let urenLine: React.ReactNode;
  if (isInactive && hasUren) {
    // Planned but not started — show budget as context
    urenLine = (
      <span className="text-slate-400">
        {t("phases.not_started")} · 0u/{hoursBudget}u
      </span>
    );
  } else if (isInactive) {
    urenLine = <span className="text-slate-400">{t("phases.not_started")}</span>;
  } else if (!hasUren) {
    urenLine = <span className="text-slate-400">{t("phases.no_hours_budget")}</span>;
  } else {
    urenLine = (
      <span className={UREN_COLOR[variant]}>
        {Math.round(spent)}u van {hoursBudget}u
      </span>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 rounded-xl border border-slate-100 p-3 text-center ${isInactive ? "bg-slate-50" : "bg-white"}`}>
      {/* Fase name — reserves 2-line height for donut alignment */}
      <div className="flex items-center justify-center min-h-[2rem] w-full">
        <span
          className={`text-xs font-medium leading-snug line-clamp-2 ${isInactive ? "text-slate-400" : "text-slate-700"}`}
        >
          {name}
        </span>
      </div>

      <Donut pct={progress} />

      {/* Hours info — fixed height so rows align */}
      <div className="min-h-[1.25rem] flex items-center justify-center">
        <span className="text-xs leading-snug">{urenLine}</span>
      </div>
    </div>
  );
}
