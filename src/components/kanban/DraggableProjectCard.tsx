import { useDraggable } from "@dnd-kit/core";
import type React from "react";
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

  const { onKeyDown: dndKeyDown, ...restListeners } = listeners ?? {};

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !isDragging) {
      e.preventDefault();
      if (onClick) onClick(project);
    }
    dndKeyDown?.(e as unknown as Event);
  }

  const opacity = isDragging ? 0.4 : isSaving ? 0.7 : 1;

  return (
    <div
      ref={setNodeRef}
      style={{ opacity, cursor: "grab", transition: "opacity 0.15s", borderRadius: "0 8px 8px 0" }}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal focus-visible:ring-offset-1"
      {...restListeners}
      {...attributes}
      aria-label={project.projectName}
      onKeyDown={handleKeyDown}
    >
      <ProjectCard project={project} onClick={onClick} tabIndex={-1} />
    </div>
  );
}
