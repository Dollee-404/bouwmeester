import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BouwmeesterStatus, Project } from "../../data/types";
import {
  STATUS_ORDER,
  ARCHIVED_STATUS_ORDER,
  STATUS_LABEL_KEYS,
} from "../kanban/status-config";
import { STATUS_COLORS } from "../../lib/status-colors";
import { ProjectCard } from "../kanban/ProjectCard";
import { useBreakpoint } from "../../hooks/use-breakpoint";

// Afgerond + true archived statuses start collapsed by default
const COLLAPSED_BY_DEFAULT = new Set<BouwmeesterStatus>([
  "Afgerond",
  ...ARCHIVED_STATUS_ORDER,
]);

interface SectionProps {
  status: BouwmeesterStatus;
  projects: Project[];
  defaultOpen: boolean;
  compact: boolean;
  onCardClick?: (project: Project) => void;
}

function Section({ status, projects, defaultOpen, compact, onCardClick }: SectionProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const color = STATUS_COLORS[status];
  const label = t(STATUS_LABEL_KEYS[status]);

  return (
    <div>
      <button
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-y-teal transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${label} (${projects.length})`}
      >
        {open
          ? <ChevronDown size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
          : <ChevronRight size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
        }
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <span className={`font-medium text-slate-700 ${compact ? "text-xs" : "text-sm"}`}>
          {label}
        </span>
        <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full leading-none">
          {projects.length}
        </span>
      </button>

      {open && projects.length > 0 && (
        <div className={`flex flex-col gap-2 ${compact ? "px-3 pb-3" : "px-4 pb-4"}`}>
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={onCardClick} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProjectsCardListProps {
  projects: Project[];
  showArchived: boolean;
  isLoading?: boolean;
  onCardClick?: (project: Project) => void;
}

export function ProjectsCardList({
  projects,
  showArchived,
  isLoading = false,
  onCardClick,
}: ProjectsCardListProps) {
  const { isMobile } = useBreakpoint();

  const allStatuses: BouwmeesterStatus[] = showArchived
    ? [...STATUS_ORDER, ...ARCHIVED_STATUS_ORDER]
    : STATUS_ORDER;

  const grouped = allStatuses.reduce<Record<string, Project[]>>((acc, status) => {
    acc[status] = projects.filter((p) => p.status === status);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="h-9 mx-4 bg-slate-100 rounded animate-pulse mb-2" />
            <div className="flex flex-col gap-2 px-4">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="h-28 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-slate-100">
      {allStatuses.map((status) => {
        const sectionProjects = grouped[status] ?? [];
        const defaultOpen =
          !COLLAPSED_BY_DEFAULT.has(status) && sectionProjects.length > 0;
        return (
          <Section
            key={status}
            status={status}
            projects={sectionProjects}
            defaultOpen={defaultOpen}
            compact={isMobile}
            onCardClick={onCardClick}
          />
        );
      })}
    </div>
  );
}
