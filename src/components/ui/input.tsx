import type { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
}

export function Input({ icon, className = "", ...props }: InputProps) {
  return (
    <div className="relative flex items-center">
      {icon && (
        <span className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
          {icon}
        </span>
      )}
      <input
        {...props}
        className={[
          "w-full rounded-md border border-slate-200 bg-white",
          "px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-y-teal focus:border-transparent",
          icon ? "pl-9" : "",
          className,
        ].join(" ")}
      />
    </div>
  );
}
