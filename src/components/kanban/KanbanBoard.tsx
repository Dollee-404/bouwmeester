import type { BouwmeesterStatus, Project } from "../../data/types";
import { STATUS_ORDER, ARCHIVED_STATUS_ORDER } from "./status-config";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
  projects: Project[];
  showArchived?: boolean;
  onCardClick?: (project: Project) => void;
  onAddNew?: (status: BouwmeesterStatus) => void;
}

export function KanbanBoard({ projects, showArchived = false, onCardClick, onAddNew }: KanbanBoardProps) {
  const columns = showArchived
    ? [...STATUS_ORDER, ...ARCHIVED_STATUS_ORDER]
    : STATUS_ORDER;

  const visible = showArchived
    ? projects
    : projects.filter((p) => !p.isArchived);

  const grouped = columns.reduce<Record<string, Project[]>>(
    (acc, status) => {
      acc[status] = visible.filter((p) => p.status === status);
      return acc;
    },
    {},
  );

  // minmax(Xpx, 1fr): on wide screens 1fr fills space, on narrow screens
  // min-width triggers overflow-x scroll — no JS resize listeners needed.
  const colCount = columns.length;
  const minColWidth = colCount === 8 ? 220 : 240;

  return (
    <div className="overflow-x-auto pb-2">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${colCount}, minmax(${minColWidth}px, 1fr))`,
          gap: 12,
        }}
      >
        {columns.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            projects={grouped[status]}
            onCardClick={onCardClick}
            onAddNew={onAddNew ? () => onAddNew(status) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
