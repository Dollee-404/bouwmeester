import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { projectDetailService } from "../../data/project-detail-service";
import type { ProjectDetail } from "../../data/detail-types";

interface DetailPanelProps {
  projectId: string;
  onClose: () => void;
}

export function DetailPanel({ projectId, onClose }: DetailPanelProps) {
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setDetail(null);
    projectDetailService
      .getProjectDetail(projectId)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/20 z-40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Paneel */}
      <div
        role="dialog"
        aria-label="Projectdetails"
        aria-modal="true"
        className="absolute top-0 right-0 h-full bg-white shadow-xl flex flex-col"
        style={{ width: "75%" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-lg font-semibold text-slate-800 truncate mr-4">
            {loading ? "Laden…" : error ? "Fout bij laden" : (detail?.projectName ?? "")}
          </h2>
          <button
            onClick={onClose}
            aria-label="Paneel sluiten"
            className="shrink-0 p-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 text-sm text-slate-500">
          Inhoud volgt in fase 3D
        </div>
      </div>
    </div>
  );
}
