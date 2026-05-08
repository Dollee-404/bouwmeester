import type { ProjectDetail, TimesheetMap } from "../../data/detail-types";
import { calcDaysFromNow } from "../../lib/deadline";
import type { KPIBlockProps } from "./KPIBlock";

type Variant = "ok" | "warning" | "danger";

function fmtEuro(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `€${Math.round(n / 1_000)}K`;
  return `€${n}`;
}

export function calcVoortgangKPI(detail: ProjectDetail, label: string): KPIBlockProps {
  const pct = detail.percentComplete;
  const days = calcDaysFromNow(detail.endDate);
  let sub: string | undefined;
  if (days !== null) {
    if (days < 0) sub = `${Math.abs(days)} d vertraagd`;
    else if (days === 0) sub = "deadline vandaag";
    else sub = `${days} d te gaan`;
  }
  return { label, value: `${pct}%`, sub, bar: { pct, variant: "ok" } };
}

export function calcBudgetKPI(detail: ProjectDetail, label: string): KPIBlockProps {
  if (!detail.budgetSales) return { label, value: "—" };
  const pct = (detail.estimatedCosting / detail.budgetSales) * 100;
  const variant: Variant = pct > 100 ? "danger" : pct > 85 ? "warning" : "ok";
  return {
    label,
    value: `${Math.round(pct)}%`,
    sub: `${fmtEuro(detail.estimatedCosting)} van ${fmtEuro(detail.budgetSales)}`,
    bar: { pct, variant },
  };
}

export function calcUrenKPI(
  detail: ProjectDetail,
  timesheets: TimesheetMap,
  label: string,
): KPIBlockProps {
  if (!detail.budgetHours) return { label, value: "—" };
  const used = Math.round(Object.values(timesheets).reduce((s, h) => s + h, 0));
  const pct = (used / detail.budgetHours) * 100;
  const variant: Variant = pct > 100 ? "danger" : pct > 85 ? "warning" : "ok";
  return {
    label,
    value: `${used}u`,
    sub: `van ${detail.budgetHours}u`,
    bar: { pct, variant },
  };
}

export function calcPlanningKPI(detail: ProjectDetail, label: string): KPIBlockProps {
  const days = calcDaysFromNow(detail.endDate);
  if (days === null) return { label, value: "—" };
  const variant: Variant = days <= 14 ? "warning" : "ok";
  let bar: KPIBlockProps["bar"];
  if (detail.startDate && detail.endDate) {
    const total = detail.endDate.getTime() - detail.startDate.getTime();
    const elapsed = Date.now() - detail.startDate.getTime();
    const pct = total > 0 ? (elapsed / total) * 100 : 0;
    bar = { pct, variant };
  }
  return {
    label,
    value: `${Math.abs(days)}d`,
    sub: days < 0 ? "vertraagd" : "te gaan",
    bar,
  };
}
