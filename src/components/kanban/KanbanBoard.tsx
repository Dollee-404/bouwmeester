import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  KeyboardCode,
  closestCenter,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import type { BouwmeesterStatus, Project } from "../../data/types";
import { STATUS_ORDER, ARCHIVED_STATUS_ORDER } from "./status-config";
import { KanbanColumn } from "./KanbanColumn";
import { ProjectCard } from "./ProjectCard";
import { useToast } from "../ui/toast";

const columnKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { currentCoordinates, context: { droppableRects } }
) => {
  if (event.code !== KeyboardCode.Right && event.code !== KeyboardCode.Left) return;

  const cols: Array<{ left: number; right: number; cx: number }> = [];
  droppableRects.forEach((rect) => {
    cols.push({ left: rect.left, right: rect.right, cx: rect.left + rect.width / 2 });
  });
  cols.sort((a, b) => a.left - b.left);
  if (cols.length === 0) return;

  let idx = cols.findIndex(
    (col) => currentCoordinates.x >= col.left && currentCoordinates.x <= col.right
  );
  if (idx === -1) {
    let minDist = Infinity;
    cols.forEach((col, i) => {
      const dist = Math.abs(col.cx - currentCoordinates.x);
      if (dist < minDist) { minDist = dist; idx = i; }
    });
  }

  const targetIdx = idx + (event.code === KeyboardCode.Right ? 1 : -1);
  if (targetIdx < 0 || targetIdx >= cols.length) return;

  return { x: cols[targetIdx].left, y: currentCoordinates.y };
};

interface KanbanBoardProps {
  projects: Project[];
  showArchived?: boolean;
  isLoading?: boolean;
  onCardClick?: (project: Project) => void;
  onAddNew?: (status: BouwmeesterStatus) => void;
  onStatusChange?: (projectId: string, newStatus: BouwmeesterStatus) => Promise<void>;
}

export function KanbanBoard({
  projects,
  showArchived = false,
  isLoading = false,
  onCardClick,
  onAddNew,
  onStatusChange,
}: KanbanBoardProps) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, BouwmeesterStatus>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates }),
  );

  // Clean up overrides once the real data catches up (after refetch)
  useEffect(() => {
    setStatusOverrides((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id in next) {
        const real = projects.find((p) => p.id === id);
        if (real && real.status === next[id]) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [projects]);

  const columns = showArchived
    ? [...STATUS_ORDER, ...ARCHIVED_STATUS_ORDER]
    : STATUS_ORDER;

  const visible = showArchived
    ? projects
    : projects.filter((p) => !p.isArchived);

  // Apply optimistic overrides on top of real data
  const displayProjects = visible.map((p) =>
    statusOverrides[p.id] ? { ...p, status: statusOverrides[p.id] } : p
  );

  const grouped = columns.reduce<Record<string, Project[]>>(
    (acc, status) => {
      acc[status] = displayProjects.filter((p) => p.status === status);
      return acc;
    },
    {},
  );

  const colCount = columns.length;
  const minColWidth = colCount === 8 ? 220 : 240;

  function handleDragStart(event: DragStartEvent) {
    const project = event.active.data.current?.project as Project | undefined;
    setActiveProject(project ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveProject(null);

    if (!over) return;

    const projectId = active.id as string;
    const newStatus = over.id as BouwmeesterStatus;

    // Find original status (before any overrides) from real projects
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const currentStatus = statusOverrides[projectId] ?? project.status;
    if (currentStatus === newStatus) return;
    if (!columns.includes(newStatus)) return;

    setStatusOverrides((prev) => ({ ...prev, [projectId]: newStatus }));

    if (onStatusChange) {
      setSavingIds((prev) => new Set([...prev, projectId]));
      try {
        await onStatusChange(projectId, newStatus);
        // Keep override — useEffect above cleans it up once projects prop updates
      } catch {
        setStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[projectId];
          return next;
        });
        addToast(t("projects.drag_drop_error"), "error");
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(projectId);
          return next;
        });
      }
    }
  }

  function handleDragCancel() {
    setActiveProject(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
              savingIds={savingIds}
              isLoading={isLoading}
              onCardClick={onCardClick}
              onAddNew={onAddNew}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeProject && (
          <div style={{ cursor: "grabbing", width: 224 }}>
            <ProjectCard project={activeProject} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
