type AvatarSize = "xs" | "sm" | "md";

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  "aria-label"?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

const COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
  "bg-rose-500",  "bg-cyan-500",    "bg-indigo-500", "bg-orange-500",
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
};

export function Avatar({ name, size = "sm", "aria-label": ariaLabel, "aria-hidden": ariaHidden }: AvatarProps) {
  return (
    <span
      className={[
        "inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0",
        colorFor(name),
        sizeClasses[size],
      ].join(" ")}
      title={name}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    >
      {initials(name)}
    </span>
  );
}
