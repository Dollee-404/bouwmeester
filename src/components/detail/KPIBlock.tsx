export interface KPIBlockProps {
  label: string;
  value: string;
  sub?: string;
  bar?: { pct: number; variant: "ok" | "warning" | "danger" };
}

const BAR_COLOR: Record<"ok" | "warning" | "danger", string> = {
  ok:      "bg-y-teal",
  warning: "bg-amber-400",
  danger:  "bg-red-500",
};

const VALUE_COLOR: Record<"ok" | "warning" | "danger", string> = {
  ok:      "text-slate-900",
  warning: "text-amber-600",
  danger:  "text-red-600",
};

export function KPIBlock({ label, value, sub, bar }: KPIBlockProps) {
  const isEmpty = value === "—";
  const valueColor = bar ? VALUE_COLOR[bar.variant] : "text-slate-900";

  return (
    <div className="bg-slate-50 rounded-lg p-4 flex flex-col min-w-0">
      <div className="flex flex-col gap-1 flex-1">
        <span className="text-xs font-medium text-slate-500 truncate">{label}</span>
        <span className={`text-2xl font-bold leading-none ${isEmpty ? "text-slate-300" : valueColor}`}>
          {value}
        </span>
        {sub && (
          <span className="text-xs text-slate-400 truncate">{sub}</span>
        )}
      </div>
      {bar && !isEmpty && (
        <div className="pt-2">
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${BAR_COLOR[bar.variant]}`}
              style={{ width: `${Math.min(bar.pct, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
