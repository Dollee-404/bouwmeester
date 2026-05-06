import type { ReactNode } from "react";

interface ToggleProps {
  options: [string, string];
  value: string;
  onChange: (value: string) => void;
  icons?: [ReactNode, ReactNode];
}

export function Toggle({ options, value, onChange, icons }: ToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-slate-200 bg-white overflow-hidden">
      {options.map((opt, i) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={[
            "px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
            value === opt
              ? "bg-y-teal-dark text-white"
              : "text-slate-600 hover:bg-slate-50",
          ].join(" ")}
        >
          {icons?.[i]}
          {opt}
        </button>
      ))}
    </div>
  );
}
