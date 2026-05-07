import { useDraggable } from "@dnd-kit/core";
import type { Project } from "../../data/types";
import { ProjectCard } from "./ProjectCard";

interface DraggableProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
}

export function DraggableProjectCard({ project, onClick }: DraggableProjectCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: project.id,
    data: { project },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.4 : 1, cursor: "grab" }}
      {...listeners}
      {...attributes}
    >
      <ProjectCard project={project} onClick={onClick} />
    </div>
  );
}
