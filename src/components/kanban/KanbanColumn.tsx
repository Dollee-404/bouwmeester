import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import type { BouwmeesterStatus, Project } from "../../data/types";
import { STATUS_COLORS, STATUS_LABEL_KEYS } from "./status-config";
import { ProjectCard } from "./ProjectCard";

interface KanbanColumnProps {
  status: BouwmeesterStatus;
  projects: Project[];
  onCardClick?: (project: Project) => void;
  onAddNew?: () => void;
}

export function KanbanColumn({ status, projects, onCardClick, onAddNew }: KanbanColumnProps) {
  const { t } = useTranslation();
  const color = STATUS_COLORS[status];
  const labelKey = STATUS_LABEL_KEYS[status];

  return (
    <div className="flex flex-col min-w-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 rounded-full"
            style={{ width: 8, height: 8, backgroundColor: color }}
          />
          <span className="text-sm font-medium text-slate-700 truncate">
            {t(labelKey)}
          </span>
          <span className="shrink-0 bg-slate-200 text-slate-600 text-xs rounded-full px-[7px] py-px leading-tight">
            {projects.length}
          </span>
        </div>
        <button
          className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
          onClick={onAddNew}
          aria-label={`Nieuw project in ${t(labelKey)}`}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Card list or empty state */}
      {projects.length === 0 ? (
        <div
          className="flex items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-lg"
          style={{ minHeight: 72, padding: 16 }}
        >
          {t("projects.empty_column")}
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 10 }}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={onCardClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
