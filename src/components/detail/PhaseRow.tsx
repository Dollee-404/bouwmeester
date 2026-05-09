// Spec: fase-naam + voortgang% + één uren-balk.
// Known limitation: tweede (budget) balk ontbreekt — per-taak kostenbudget niet beschikbaar in ERPNext
// Task-data in RONDE 3. Toevoegen in RONDE 4+ wanneer cost-budget per task beschikbaar is.

interface PhaseRowProps {
  name: string;
  progress: number;
  hoursSpent?: number;
  hoursBudget?: number;
}

const UREN_BAR_COLOR: Record<"ok" | "warning" | "danger", string> = {
  ok:      "bg-y-teal",
  warning: "bg-amber-400",
  danger:  "bg-red-500",
};

export function PhaseRow({ name, progress, hoursSpent, hoursBudget }: PhaseRowProps) {
  const hasUrenBar = hoursBudget != null && hoursBudget > 0;
  const urenPct = hasUrenBar && hoursSpent != null
    ? (hoursSpent / hoursBudget!) * 100
    : 0;
  const urenVariant: "ok" | "warning" | "danger" =
    urenPct > 100 ? "danger" : urenPct > 85 ? "warning" : "ok";

  const urenPctColor =
    urenVariant === "danger" ? "text-red-600"
    : urenVariant === "warning" ? "text-amber-600"
    : "text-slate-500";

  return (
    <div className="py-4 border-b border-slate-100 last:border-b-0">
      <span className="text-sm font-medium text-slate-800 block mb-2">{name}</span>
      {/* Voortgangsbalk + % op dezelfde rij */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-y-teal rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-slate-500 w-8 text-right shrink-0">{progress}%</span>
      </div>
      {/* Urenbalk + % op dezelfde rij */}
      {hasUrenBar && (
        <div className="mt-2">
          <span className="text-xs text-slate-400">{hoursSpent ?? 0}u van {hoursBudget}u</span>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${UREN_BAR_COLOR[urenVariant]}`}
                style={{ width: `${Math.min(urenPct, 100)}%` }}
              />
            </div>
            <span className={`text-xs w-8 text-right shrink-0 ${urenPctColor}`}>
              {Math.round(urenPct)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
