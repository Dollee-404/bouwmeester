import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center text-center rounded-xl bg-slate-50",
        compact ? "py-6 px-4" : "py-16 px-8",
      ].join(" ")}
    >
      {icon && <div className="text-slate-300 mb-3">{icon}</div>}
      <p
        className={
          compact
            ? "text-xs font-medium text-slate-500"
            : "text-sm font-medium text-slate-600"
        }
      >
        {title}
      </p>
      {description && (
        <p className="text-xs text-slate-400 mt-1">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
