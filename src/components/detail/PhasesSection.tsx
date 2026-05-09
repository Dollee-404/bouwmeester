import { useState } from "react";
import { FolderOpen, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { projectDetailService } from "../../data/project-detail-service";
import type { ProjectTask, TimesheetMap } from "../../data/detail-types";
import type { Werksoort } from "../../data/types";
import { getPhaseTemplate } from "../../data/default-phase-templates";
import { PhaseCard } from "./PhaseCard";
import { Button } from "../ui/button";

// Dev-only: ?demoPhases injecteert demo-variatie voor visuele STOP-reviews
const DEMO_PHASES = new URLSearchParams(window.location.search).has("demoPhases");
const DEMO_CARDS = [
  { id: "demo-1", name: "Sloop",       progress: 100, hoursSpent: 240, hoursBudget: 200 },
  { id: "demo-2", name: "Ruwbouw",     progress: 65,  hoursSpent: 580, hoursBudget: 900 },
  { id: "demo-3", name: "Afbouw",      progress: 10,  hoursSpent: 80,  hoursBudget: 450 },
  { id: "demo-4", name: "Installatie", progress: 0,   hoursSpent: 0,   hoursBudget: 300 },
  { id: "demo-5", name: "Oplevering",  progress: 0 },
] as const;

interface PhasesSectionProps {
  tasks: ProjectTask[];
  timesheets: TimesheetMap;
  projectId: string;
  werksoort: Werksoort | null;
  onPhasesCreated: () => void;
  mode: "drawer" | "overlay" | "fullpage";
}

export function PhasesSection({ tasks, timesheets, projectId, werksoort, onPhasesCreated, mode }: PhasesSectionProps) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);

  const phases = tasks.filter((task) => !task.parentTask);
  const childrenByParent: Record<string, ProjectTask[]> = {};
  for (const task of tasks) {
    if (task.parentTask) {
      (childrenByParent[task.parentTask] ??= []).push(task);
    }
  }

  const hasTemplate = werksoort != null && getPhaseTemplate(werksoort) != null;

  async function handleCreate() {
    if (!werksoort) return;
    setCreating(true);
    setCreateError(false);
    try {
      await projectDetailService.createDefaultPhaseTasks(projectId, werksoort);
      onPhasesCreated();
    } catch {
      setCreating(false);
      setCreateError(true);
    }
  }

  if (phases.length === 0) {
    const werksoortLabel = werksoort ? t(`werksoort.${werksoort.toLowerCase()}`) : "";
    return (
      <div className="py-8 flex flex-col items-center gap-3 text-center">
        <FolderOpen size={28} className="text-slate-300" />
        <p className="text-sm text-slate-400">{t("phases.empty_title")}</p>
        {hasTemplate && (
          <Button variant="secondary" size="sm" loading={creating} onClick={handleCreate}>
            {t("phases.empty_button", { werksoort: werksoortLabel })}
          </Button>
        )}
        {createError && (
          <p className="text-xs text-red-600 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            {t("phases.create_error")}
          </p>
        )}
      </div>
    );
  }

  const gridCols =
    mode === "drawer"    ? "grid-cols-4"
    : mode === "overlay" ? "grid-cols-3"
    : "grid-cols-2";

  if (DEMO_PHASES) {
    return (
      <div className={`grid gap-3 ${gridCols}`}>
        {DEMO_CARDS.map((c) => (
          <PhaseCard key={c.id} name={c.name} progress={c.progress} hoursSpent={c.hoursSpent} hoursBudget={c.hoursBudget} />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-3 ${gridCols}`}>
      {phases.map((phase) => {
        const children = childrenByParent[phase.id] ?? [];
        const hoursSpent =
          (timesheets[phase.id] ?? 0) +
          children.reduce((sum, child) => sum + (timesheets[child.id] ?? 0), 0);
        const hoursBudget = phase.budgetHours && phase.budgetHours > 0
          ? phase.budgetHours
          : undefined;
        return (
          <PhaseCard
            key={phase.id}
            name={phase.subject}
            progress={phase.progress}
            hoursSpent={hoursSpent}
            hoursBudget={hoursBudget}
          />
        );
      })}
    </div>
  );
}
