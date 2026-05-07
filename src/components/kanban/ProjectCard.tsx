import type React from "react";
import { useTranslation } from "react-i18next";
import { Calendar, AlertTriangle } from "lucide-react";
import type { Project } from "../../data/types";
import { WerksoortBadge } from "../ui/badge";
import { Avatar } from "../ui/avatar";
import { useToast } from "../ui/toast";
import { STATUS_COLORS } from "./status-config";
import { getDeadlineStatus, formatEndDate } from "../../lib/deadline";

interface ProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
  tabIndex?: number;
}

const TONE_CLASSES = {
  "on-track": "text-emerald-600",
  "soon":     "text-amber-600",
  "overdue":  "text-red-600",
  "neutral":  "text-slate-400",
};

export function ProjectCard({ project, onClick, tabIndex = 0 }: ProjectCardProps) {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const statusColor = STATUS_COLORS[project.status];
  const deadline = getDeadlineStatus(project);
  const isOverBudget = project.budgetSales > 0 && project.billedAmount > project.budgetSales;
  const progressPct = project.budgetSales > 0
    ? Math.min((project.billedAmount / project.budgetSales) * 100, 100)
    : 0;

  function handleClick() {
    if (onClick) {
      onClick(project);
    } else {
      addToast(t("common.not_available"), "info");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  }

  return (
    <div
      role="button"
      tabIndex={tabIndex}
      aria-label={t("a11y.project_card", { name: project.projectName })}
      className="bg-white cursor-pointer hover:shadow-md transition-shadow select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal focus-visible:ring-offset-1"
      style={{
        borderTop: "0.5px solid #e2e8f0",
        borderRight: "0.5px solid #e2e8f0",
        borderBottom: "0.5px solid #e2e8f0",
        borderLeft: `3px solid ${statusColor}`,
        borderRadius: "0 8px 8px 0",
        padding: "12px",
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Row 1: project number + werksoort badge */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[11px] text-slate-400">{project.id}</span>
        <WerksoortBadge werksoort={project.werksoort} />
      </div>

      {/* Row 2: project name + customer */}
      <div className="mb-2">
        <p className="text-[14px] font-medium text-slate-900 leading-snug line-clamp-2">
          {project.projectName}
        </p>
        <p className="text-[12px] text-slate-500 mt-0.5 truncate">{project.customerName}</p>
      </div>

      {/* Row 3: date row — altijd tonen */}
      <div className={`flex items-center gap-1.5 text-[12px] mb-2 ${project.endDate ? TONE_CLASSES[deadline.tone] : "text-slate-400"}`}>
        <Calendar size={12} className="shrink-0" aria-hidden="true" />
        {project.endDate ? (
          <>
            <span>{formatEndDate(project.endDate)}</span>
            {deadline.label !== "deadline.date_only" && deadline.tone !== "neutral" && (
              <>
                <span className="text-slate-300">·</span>
                <span>
                  {deadline.tone === "overdue"
                    ? t("deadline.overdue", { days: deadline.days })
                    : t(deadline.label)}
                </span>
              </>
            )}
          </>
        ) : (
          <span>{t("card.no_end_date")}</span>
        )}
      </div>

      {/* Row 4: budget overschrijding banner */}
      {isOverBudget && (
        <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-md px-2.5 py-1.5 mb-2">
          <AlertTriangle size={12} className="text-red-500 shrink-0" aria-hidden="true" />
          <span className="text-[11px] text-red-600 font-medium">Budget overschreden</span>
        </div>
      )}

      {/* Row 5: budget + progress bar */}
      {project.budgetSales > 0 && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span>Besteed: € {project.billedAmount.toLocaleString("nl-NL")}</span>
            <span className="text-slate-400">€ {project.budgetSales.toLocaleString("nl-NL")}</span>
          </div>
          <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isOverBudget ? "bg-red-500" : "bg-emerald-500"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Row 6: footer — altijd tonen */}
      <div className="flex items-center mt-1">
        {project.projectManager ? (
          <Avatar
            name={project.projectManager}
            size="xs"
            aria-label={t("a11y.project_manager", { name: project.projectManager })}
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-slate-200 shrink-0" />
            <span className="text-[11px] text-slate-400">{t("card.no_project_manager")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
