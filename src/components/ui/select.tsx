import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}

export function Select({ options, className = "", ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={[
        "rounded-md border border-slate-200 bg-white",
        "px-3 py-1.5 text-sm text-slate-900",
        "focus:outline-none focus:ring-2 focus:ring-y-teal focus:border-transparent",
        className,
      ].join(" ")}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
