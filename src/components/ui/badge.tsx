import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "purple" | "neutral";
type BadgeSize = "sm" | "xs";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-y-teal/10 text-y-teal-dark",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger:  "bg-red-100 text-red-700",
  info:    "bg-blue-100 text-blue-800",
  purple:  "bg-purple-100 text-purple-800",
  neutral: "bg-slate-100 text-slate-600",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  xs: "px-1.5 py-0 text-[10px]",
};

export function Badge({
  variant = "default",
  size = "sm",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center font-medium rounded-full whitespace-nowrap",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
