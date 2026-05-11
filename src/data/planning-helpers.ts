// Statische NL-feestdagen 2025-2027 (YYYY-MM-DD).
// Variabele feestdagen (Pasen, Hemelvaart, Pinksteren) zijn vooraf berekend.
// Koningsdag verschuift naar zaterdag als 27 april een zondag is.
interface NLHoliday { date: string; name: string }

const NL_HOLIDAYS: readonly NLHoliday[] = [
  // 2025
  { date: "2025-01-01", name: "Nieuwjaarsdag" },
  { date: "2025-04-18", name: "Goede Vrijdag" },
  { date: "2025-04-20", name: "Eerste Paasdag" },
  { date: "2025-04-21", name: "Tweede Paasdag" },
  { date: "2025-04-26", name: "Koningsdag" }, // 27 apr = zondag → 26 apr
  { date: "2025-05-05", name: "Bevrijdingsdag" }, // lustrum: 80 jaar bevrijding
  { date: "2025-05-29", name: "Hemelvaartsdag" },
  { date: "2025-06-08", name: "Eerste Pinksterdag" },
  { date: "2025-06-09", name: "Tweede Pinksterdag" },
  { date: "2025-12-25", name: "Eerste Kerstdag" },
  { date: "2025-12-26", name: "Tweede Kerstdag" },
  // 2026 — Bevrijdingsdag is geen vrije dag (geen lustrum; volgende: 2030)
  { date: "2026-01-01", name: "Nieuwjaarsdag" },
  { date: "2026-04-03", name: "Goede Vrijdag" },
  { date: "2026-04-05", name: "Eerste Paasdag" },
  { date: "2026-04-06", name: "Tweede Paasdag" },
  { date: "2026-04-27", name: "Koningsdag" },
  { date: "2026-05-14", name: "Hemelvaartsdag" },
  { date: "2026-05-24", name: "Eerste Pinksterdag" },
  { date: "2026-05-25", name: "Tweede Pinksterdag" },
  { date: "2026-12-25", name: "Eerste Kerstdag" },
  { date: "2026-12-26", name: "Tweede Kerstdag" },
  // 2027 — Bevrijdingsdag is geen vrije dag (geen lustrum; volgende: 2030)
  { date: "2027-01-01", name: "Nieuwjaarsdag" },
  { date: "2027-03-26", name: "Goede Vrijdag" },
  { date: "2027-03-28", name: "Eerste Paasdag" },
  { date: "2027-03-29", name: "Tweede Paasdag" },
  { date: "2027-04-27", name: "Koningsdag" },
  { date: "2027-05-06", name: "Hemelvaartsdag" },
  { date: "2027-05-16", name: "Eerste Pinksterdag" },
  { date: "2027-05-17", name: "Tweede Pinksterdag" },
  { date: "2027-12-25", name: "Eerste Kerstdag" },
  { date: "2027-12-26", name: "Tweede Kerstdag" },
];

const HOLIDAY_SET = new Set(NL_HOLIDAYS.map(h => h.date));

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function isHoliday(d: Date): boolean {
  return HOLIDAY_SET.has(toDateKey(d));
}

/**
 * Telt werkbare dagen (ma-vr, excl. NL feestdagen 2025-2027) tussen
 * startDate (inclusief) en endDate (inclusief).
 * Geeft 0 terug als endDate vóór startDate ligt.
 */
export function countWorkingDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (end < start) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (!isWeekend(cur) && !isHoliday(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Geeft de feestdagen terug die in de opgegeven periode vallen,
 * gesorteerd op datum. Handig voor console-output / debugging.
 */
export function getHolidaysInRange(startDate: Date, endDate: Date): NLHoliday[] {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  return NL_HOLIDAYS.filter((h) => {
    const d = new Date(h.date);
    return d >= start && d <= end;
  });
}

// ─── ISO-weeknummer ───────────────────────────────────────────────────────────

/**
 * Berekent het ISO-weeknummer (NL-standaard: maandag = start, week 1 = week
 * met de eerste donderdag van het jaar).
 */
export function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  // Donderdag van de huidige week bepaalt het jaar van de week
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ─── Wacht-op verrijking ─────────────────────────────────────────────────────

import type { ProjectTask } from "./detail-types";

const AFGEROND_STATUSSEN = new Set(["Completed", "Cancelled"]);

/**
 * Verrijkt elke Task met een automatisch afgeleid wacht-op-veld als:
 * - custom_wacht_op leeg is (handmatig veld heeft altijd voorrang)
 * - de task niet afgerond/geannuleerd is
 * - minstens één depends_on-taak nog niet afgerond is
 *
 * Geeft de blokkerende taaknamen mee als wachtOpToelichting zodat het
 * detail-paneel "Voorgaande taak: Metselwerk, Isolatie" kan tonen.
 */
export function enrichTasksWithWachtOp(tasks: ProjectTask[]): ProjectTask[] {
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  return tasks.map((task) => {
    if (task.wachtOp) return task; // handmatig veld heeft voorrang
    if (AFGEROND_STATUSSEN.has(task.status)) return task;
    if (task.dependsOn.length === 0) return task;

    const blokkerend = task.dependsOn
      .map((id) => taskById.get(id))
      .filter((dep): dep is ProjectTask => dep !== undefined && !AFGEROND_STATUSSEN.has(dep.status));

    if (blokkerend.length === 0) return task;

    return {
      ...task,
      wachtOp: "Voorgaande taak",
      wachtOpToelichting: blokkerend.map((d) => d.subject).join(", "),
    };
  });
}

// ─── Task-data parse-helpers ─────────────────────────────────────────────────
// Geëxporteerd zodat unit-tests de productiecode raken (niet een kopie).

/**
 * Parseert het `depends_on_tasks`-veld van een ERPNext Task.
 * Frappe slaat dit op als komma-gescheiden string: "TASK-001, TASK-002".
 * Spaties rondom komma's en lege segmenten worden genegeerd.
 */
export function parseDependsOn(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Parseert het `_assign`-veld van een ERPNext document.
 * Frappe slaat dit op als JSON-array-string: '["user@example.nl"]'.
 * Bij parse-fouten of niet-array waarden: lege array.
 */
export function parseAssign(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Parseert een datum-string naar een Date-object.
 * Geeft null bij ontbrekende of ongeldige waarde.
 */
export function parseTaskDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Kritieke-pad-berekening ──────────────────────────────────────────────────

export interface CriticalPathTask {
  id: string;
  duration: number; // in werkbare dagen
  dependsOn: string[]; // IDs van taken waar deze taak van afhankelijk is
}

export interface CriticalPathTaskResult {
  id: string;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  float: number; // speling in dagen; 0 = kritiek
  isCritical: boolean;
}

export interface CriticalPathResult {
  tasks: Map<string, CriticalPathTaskResult>;
  criticalPath: string[]; // geordende reeks kritieke taak-IDs
  projectDuration: number;
}

/**
 * Berekent het kritieke pad via forward/backward pass (CPM).
 * Ondersteunt parallelle paden en meerdere afhankelijkheden per taak.
 *
 * Aannames:
 * - Geen cyclische afhankelijkheden
 * - Tijdseenheden zijn werkbare dagen (of willekeurige integer-eenheden)
 */
export function computeCriticalPath(tasks: CriticalPathTask[]): CriticalPathResult {
  if (tasks.length === 0) {
    return { tasks: new Map(), criticalPath: [], projectDuration: 0 };
  }

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // ── Topologische sortering (Kahn's algoritme) ────────────────────────────
  const inDegree = new Map<string, number>();
  const successors = new Map<string, string[]>();

  for (const t of tasks) {
    if (!inDegree.has(t.id)) inDegree.set(t.id, 0);
    if (!successors.has(t.id)) successors.set(t.id, []);
    for (const dep of t.dependsOn) {
      inDegree.set(t.id, (inDegree.get(t.id) ?? 0) + 1);
      if (!successors.has(dep)) successors.set(dep, []);
      successors.get(dep)!.push(t.id);
    }
  }

  const queue = tasks.filter((t) => (inDegree.get(t.id) ?? 0) === 0).map((t) => t.id);
  const topoOrder: string[] = [];
  const remaining = new Map(inDegree);

  while (queue.length > 0) {
    const id = queue.shift()!;
    topoOrder.push(id);
    for (const succ of successors.get(id) ?? []) {
      const deg = (remaining.get(succ) ?? 0) - 1;
      remaining.set(succ, deg);
      if (deg === 0) queue.push(succ);
    }
  }

  // ── Forward pass: berekent vroegste start (ES) en vroegste einde (EF) ────
  const es = new Map<string, number>();
  const ef = new Map<string, number>();

  for (const id of topoOrder) {
    const task = taskMap.get(id)!;
    const maxPredEF = task.dependsOn.length === 0
      ? 0
      : Math.max(...task.dependsOn.map((dep) => ef.get(dep) ?? 0));
    es.set(id, maxPredEF);
    ef.set(id, maxPredEF + task.duration);
  }

  const projectDuration = Math.max(...[...ef.values()]);

  // ── Backward pass: berekent laatste start (LS) en laatste einde (LF) ─────
  const ls = new Map<string, number>();
  const lf = new Map<string, number>();

  for (const id of [...topoOrder].reverse()) {
    const succIds = successors.get(id) ?? [];
    const minSuccLS = succIds.length === 0
      ? projectDuration
      : Math.min(...succIds.map((s) => ls.get(s) ?? projectDuration));
    lf.set(id, minSuccLS);
    ls.set(id, minSuccLS - taskMap.get(id)!.duration);
  }

  // ── Float en kritiek-markering ────────────────────────────────────────────
  const resultMap = new Map<string, CriticalPathTaskResult>();
  for (const id of topoOrder) {
    const taskFloat = (ls.get(id) ?? 0) - (es.get(id) ?? 0);
    resultMap.set(id, {
      id,
      earlyStart: es.get(id) ?? 0,
      earlyFinish: ef.get(id) ?? 0,
      lateStart: ls.get(id) ?? 0,
      lateFinish: lf.get(id) ?? 0,
      float: taskFloat,
      isCritical: taskFloat === 0,
    });
  }

  // ── Kritiek pad: geordende reeks kritieke taken ───────────────────────────
  const criticalPath = topoOrder.filter((id) => resultMap.get(id)!.isCritical);

  return { tasks: resultMap, criticalPath, projectDuration };
}
