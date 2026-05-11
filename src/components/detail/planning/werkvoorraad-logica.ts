import type { ProjectTask, TimesheetMap } from "../../../data/detail-types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type WerkvoorraadReden =
  | { type: "achterstallig" }
  | { type: "start-vandaag" }
  | { type: "start-morgen" }
  | { type: "start-dag"; dag: string }
  | { type: "klaar-voor"; dag: string }
  | { type: "mijlpaal"; overDagen: number }
  | { type: "vrijgekomen" }
  | { type: "wacht-op"; label: string };

export interface WerkvoorraadItem {
  id: string;
  subject: string;
  assignedTo: string | null;
  heeftDiscrepantie: boolean;
  reden: WerkvoorraadReden;
}

// ── Week-helpers ──────────────────────────────────────────────────────────────

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
  return r;
}

function endOfWeek(d: Date): Date {
  const r = new Date(startOfWeek(d));
  r.setDate(r.getDate() + 6);
  r.setHours(23, 59, 59, 999);
  return r;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dagNaam(date: Date): string {
  return date.toLocaleDateString("nl-NL", { weekday: "long" });
}

// ── Urgentie-sortering ────────────────────────────────────────────────────────

function urgentie(reden: WerkvoorraadReden): number {
  switch (reden.type) {
    case "achterstallig": return 0;
    case "start-vandaag": return 1;
    case "vrijgekomen":   return 2;
    case "start-morgen":  return 3;
    case "start-dag":     return 4;
    case "klaar-voor":    return 5;
    case "mijlpaal":      return 6;
    case "wacht-op":      return 7;
  }
}

// ── Selectie-logica ───────────────────────────────────────────────────────────

const AFGEROND = new Set(["Completed", "Cancelled"]);

export function computeWerkvoorraad(
  tasks: ProjectTask[],
  timesheets: TimesheetMap,
  today: Date,
): WerkvoorraadItem[] {
  const now = new Date(today);
  now.setHours(0, 0, 0, 0);
  const morgen = new Date(now);
  morgen.setDate(morgen.getDate() + 1);
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const items: WerkvoorraadItem[] = [];

  for (const task of tasks) {
    if (AFGEROND.has(task.status)) continue;
    if (task.isGroup) continue;

    const start = task.expectedStartDate;
    const end = task.expectedEndDate;
    let reden: WerkvoorraadReden | null = null;

    // Criterium 3: achterstallig — einddatum verstreken, nog niet gereed
    if (end && end < now) {
      reden = { type: "achterstallig" };
    }

    // Criterium 4: vrijgekomen — ≥1 depends_on, alle afgerond, start deze week of eerder
    // Vóór criterium 1 gecontroleerd: "deur is opengegaan" is informatiever dan "start [dag]"
    if (!reden && task.dependsOn.length > 0 && task.status === "Open" && start && start <= weekEnd) {
      const alleAfgerond = task.dependsOn.every((depId) => {
        const dep = taskById.get(depId);
        return dep !== undefined && AFGEROND.has(dep.status);
      });
      if (alleAfgerond) {
        reden = { type: "vrijgekomen" };
      }
    }

    // Criterium 1: startdatum valt deze week
    if (!reden && start && start >= weekStart && start <= weekEnd) {
      if (sameDay(start, now)) {
        reden = { type: "start-vandaag" };
      } else if (sameDay(start, morgen)) {
        reden = { type: "start-morgen" };
      } else {
        reden = { type: "start-dag", dag: dagNaam(start) };
      }
    }

    // Criterium 5: mijlpaal binnen 14 dagen — vóór criterium 2, anders vangt "klaar-voor" hem
    if (!reden && task.isMilestone && end) {
      const diffDagen = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
      if (diffDagen >= 0 && diffDagen <= 14) {
        reden = { type: "mijlpaal", overDagen: diffDagen };
      }
    }

    // Criterium 2: einddatum valt deze week (maar niet achterstallig, niet mijlpaal)
    if (!reden && end && end >= weekStart && end <= weekEnd) {
      reden = { type: "klaar-voor", dag: dagNaam(end) };
    }

    if (!reden) continue;

    // wacht-op overlay: als het veld gezet is, vervangt het de why-tag (4F vult dit verder in)
    if (task.wachtOp) {
      reden = { type: "wacht-op", label: `wacht op ${task.wachtOp.toLowerCase()}` };
    }

    const heeftDiscrepantie =
      task.budgetHours !== null &&
      task.budgetHours > 0 &&
      (timesheets[task.id] ?? 0) >= 0.8 * task.budgetHours &&
      task.progress < 80;

    items.push({
      id: task.id,
      subject: task.subject,
      assignedTo: task.assignedTo[0] ?? null,
      heeftDiscrepantie,
      reden,
    });
  }

  items.sort((a, b) => urgentie(a.reden) - urgentie(b.reden));
  return items;
}
