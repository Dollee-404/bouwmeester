import type { ProjectTask } from "../../../data/detail-types";
import { computeCriticalPath } from "../../../data/planning-helpers";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GanttFase {
  id: string;
  subject: string;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  progress: number;
  isCritical: boolean;
}

export interface GanttMijlpaal {
  id: string;
  subject: string;
  date: Date;
}

export interface GanttData {
  fases: GanttFase[];
  mijlpalen: GanttMijlpaal[];
  projectStart: Date | null;
  projectEnd: Date | null;
}

// ── Logica ────────────────────────────────────────────────────────────────────

const AFGEROND = new Set(["Completed", "Cancelled"]);

export function computeGanttData(tasks: ProjectTask[]): GanttData {
  const phases   = tasks.filter(t => t.isGroup);
  const leaves   = tasks.filter(t => !t.isGroup && !t.isMilestone);
  const milItems = tasks.filter(t => t.isMilestone && !t.isGroup && t.expectedEndDate);

  // Children per phase
  const byPhase = new Map<string, ProjectTask[]>();
  for (const t of leaves) {
    if (t.parentTask) {
      const arr = byPhase.get(t.parentTask) ?? [];
      arr.push(t);
      byPhase.set(t.parentTask, arr);
    }
  }

  // Critical path over leaf tasks
  const cp = computeCriticalPath(
    leaves.map(t => ({
      id: t.id,
      duration: Math.max(1, Math.round(t.budgetHours ?? 1)),
      dependsOn: t.dependsOn,
    }))
  );

  const fases: GanttFase[] = phases.map(phase => {
    const children = byPhase.get(phase.id) ?? [];

    let plannedStart = phase.expectedStartDate;
    let plannedEnd   = phase.expectedEndDate;

    if (!plannedStart && children.length > 0) {
      const starts = children.flatMap(c => c.expectedStartDate ? [c.expectedStartDate.getTime()] : []);
      if (starts.length) plannedStart = new Date(Math.min(...starts));
    }
    if (!plannedEnd && children.length > 0) {
      const ends = children.flatMap(c => c.expectedEndDate ? [c.expectedEndDate.getTime()] : []);
      if (ends.length) plannedEnd = new Date(Math.max(...ends));
    }

    // Progress: average of open children; 100 if all completed; fall back to phase.progress
    let progress = phase.progress;
    if (children.length > 0) {
      const active = children.filter(c => !AFGEROND.has(c.status));
      progress = active.length === 0
        ? 100
        : Math.round(active.reduce((s, c) => s + c.progress, 0) / active.length);
    }

    const isCritical = children.some(c => cp.tasks.get(c.id)?.isCritical ?? false);

    return { id: phase.id, subject: phase.subject, plannedStart, plannedEnd, progress, isCritical };
  });

  // Project date bounds
  const allMs = tasks
    .flatMap(t => [t.expectedStartDate, t.expectedEndDate])
    .filter(Boolean)
    .map(d => d!.getTime());
  const projectStart = allMs.length ? new Date(Math.min(...allMs)) : null;
  const projectEnd   = allMs.length ? new Date(Math.max(...allMs)) : null;

  return {
    fases: fases.filter(f => f.plannedStart || f.plannedEnd),
    mijlpalen: milItems
      .map(t => ({ id: t.id, subject: t.subject, date: t.expectedEndDate! }))
      .sort((a, b) => a.date.getTime() - b.date.getTime()),
    projectStart,
    projectEnd,
  };
}
