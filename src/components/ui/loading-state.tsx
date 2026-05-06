import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
}

export function LoadingState({ message = "Laden...", fullPage = false }: LoadingStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center gap-3 text-slate-500",
        fullPage ? "h-screen" : "py-16",
      ].join(" ")}
    >
      <Loader2 className="animate-spin" size={24} />
      <p className="text-sm">{message}</p>
    </div>
  );
}
