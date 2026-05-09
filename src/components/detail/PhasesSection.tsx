import { useState } from "react";
import { FolderOpen, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { projectDetailService } from "../../data/project-detail-service";
import type { ProjectTask, TimesheetMap } from "../../data/detail-types";
import type { Werksoort } from "../../data/types";
import { getPhaseTemplate } from "../../data/default-phase-templates";
import { PhaseRow } from "./PhaseRow";
import { Button } from "../ui/button";

interface PhasesSectionProps {
  tasks: ProjectTask[];
  timesheets: TimesheetMap;
  projectId: string;
  werksoort: Werksoort | null;
  onPhasesCreated: () => void;
}

export function PhasesSection({ tasks, timesheets, projectId, werksoort, onPhasesCreated }: PhasesSectionProps) {
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

  return (
    <div>
      {phases.map((phase) => {
        const children = childrenByParent[phase.id] ?? [];
        const hoursSpent =
          (timesheets[phase.id] ?? 0) +
          children.reduce((sum, child) => sum + (timesheets[child.id] ?? 0), 0);
        const hoursBudget = phase.budgetHours && phase.budgetHours > 0
          ? phase.budgetHours
          : undefined;
        return (
          <PhaseRow
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
