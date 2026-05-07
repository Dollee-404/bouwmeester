import { useDraggable } from "@dnd-kit/core";
import type { Project } from "../../data/types";
import { ProjectCard } from "./ProjectCard";

interface DraggableProjectCardProps {
  project: Project;
  isSaving?: boolean;
  onClick?: (project: Project) => void;
}

export function DraggableProjectCard({ project, isSaving = false, onClick }: DraggableProjectCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: project.id,
    data: { project },
  });

  const opacity = isDragging ? 0.4 : isSaving ? 0.7 : 1;

  return (
    <div
      ref={setNodeRef}
      style={{ opacity, cursor: "grab", transition: "opacity 0.15s" }}
      {...listeners}
      {...attributes}
    >
      <ProjectCard project={project} onClick={onClick} />
    </div>
  );
}
