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

  // Merge Enter key (click trigger) with dnd-kit's keyboard listener (Space = drag, arrows = navigate).
  // Keyboard flow: Tab → focus outer div → Space picks up card → arrow keys move between columns
  // → Space/Enter drops, Escape cancels. Enter (when not dragging) triggers the card click action.
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
    // Keyboard flow: Tab → focus here → Space picks up card for drag → arrow keys move
    // between drop zones → Space/Enter drops, Escape cancels.
    // Enter (when not dragging) triggers the card click action via handleKeyDown above.
    // aria-label overrides dnd-kit's default (which only has aria-roledescription/describedby).
    <div
      ref={setNodeRef}
      style={{ opacity, cursor: "grab", transition: "opacity 0.15s" }}
      {...restListeners}
      {...attributes}
      aria-label={project.projectName}
      onKeyDown={handleKeyDown}
    >
      {/* tabIndex={-1}: outer div is the keyboard tab stop; inner card renders visuals only */}
      <ProjectCard project={project} onClick={onClick} tabIndex={-1} />
    </div>
  );
}
