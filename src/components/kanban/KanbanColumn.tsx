import { useDroppable } from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import type { BouwmeesterStatus, Project } from "../../data/types";
import { STATUS_COLORS, STATUS_LABEL_KEYS } from "./status-config";
import { DraggableProjectCard } from "./DraggableProjectCard";

interface KanbanColumnProps {
  status: BouwmeesterStatus;
  projects: Project[];
  savingIds?: Set<string>;
  onCardClick?: (project: Project) => void;
  onAddNew?: () => void;
}

export function KanbanColumn({ status, projects, savingIds, onCardClick, onAddNew }: KanbanColumnProps) {
  const { t } = useTranslation();
  const color = STATUS_COLORS[status];
  const labelKey = STATUS_LABEL_KEYS[status];
  const { isOver, setNodeRef } = useDroppable({ id: status });

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

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 flex flex-col rounded-lg transition-colors duration-150"
        style={
          isOver
            ? { backgroundColor: "rgba(0,104,118,0.06)", outline: "2px solid rgba(0,104,118,0.22)", outlineOffset: 2 }
            : undefined
        }
      >
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
              <DraggableProjectCard
                key={project.id}
                project={project}
                isSaving={savingIds?.has(project.id) ?? false}
                onClick={onCardClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
