import type { Project } from "../data/types";

export type DeadlineTone = "on-track" | "soon" | "overdue" | "neutral";

export interface DeadlineStatus {
  tone: DeadlineTone;
  label: string;
  days?: number;
}

const SOON_THRESHOLD_DAYS = 14;

const ACTIVE_STATUSES = new Set(["Gegund", "In uitvoering"]);

export function getDeadlineStatus(project: Project): DeadlineStatus {
  if (project.percentComplete === 100 || project.isArchived) {
    return { tone: "neutral", label: "deadline.completed" };
  }

  if (!project.endDate) {
    return { tone: "neutral", label: "deadline.no_date" };
  }

  if (!ACTIVE_STATUSES.has(project.status)) {
    return { tone: "neutral", label: "deadline.date_only" };
  }

  const now = new Date();
  const diffMs = project.endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { tone: "overdue", label: "deadline.overdue", days: Math.abs(diffDays) };
  }
  if (diffDays <= SOON_THRESHOLD_DAYS) {
    return { tone: "soon", label: "deadline.soon" };
  }
  return { tone: "on-track", label: "deadline.on_track" };
}

// Gedeelde helper voor Voortgang- en Planning-KPI: positief = toekomst, negatief = verleden
export function calcDaysFromNow(date: Date | null): number | null {
  if (!date) return null;
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatEndDate(date: Date): string {
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
}
