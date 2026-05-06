import type { ReactNode } from "react";

type CardVariant = "container" | "info";

interface CardProps {
  variant?: CardVariant;
  children: ReactNode;
  className?: string;
}

export function Card({ variant = "container", children, className = "" }: CardProps) {
  const base =
    variant === "container"
      ? "bg-white rounded-lg shadow-sm border border-slate-200"
      : "bg-slate-50 rounded-lg";
  return <div className={`${base} ${className}`}>{children}</div>;
}
