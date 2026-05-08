import { useCallback, useEffect, useRef, useState } from "react";
import { X, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { projectDetailService } from "../../data/project-detail-service";
import type { ProjectDetail } from "../../data/detail-types";
import { useMediaQuery } from "../../hooks/use-breakpoint";

const ANIMATION_MS = 250;

interface DetailPanelProps {
  projectId: string;
  onClose: () => void;
}

export function DetailPanel({ projectId, onClose }: DetailPanelProps) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Panel breakpoints — independent of the existing useBreakpoint values
  const isMobilePanel = useMediaQuery(768);   // <768px  → full-page
  const isNarrowPanel = useMediaQuery(1280);  // <1280px → overlay; ≥1280px → drawer
  const mode = isMobilePanel ? "fullpage" : isNarrowPanel ? "overlay" : "drawer";

  // Trigger enter animation after first paint
  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Cleanup close timer on unmount
  useEffect(() => {
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, []);

  // Animate out first, then call the real onClose
  const handleClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setIsVisible(false);
    closeTimerRef.current = setTimeout(onClose, ANIMATION_MS);
  }, [onClose]);

  // Data fetch — cancelled flag prevents state update after unmount
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

  // Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === "Escape") handleClose(); }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  const headerTitle = loading
    ? t("common.loading")
    : error
    ? t("panel.load_error")
    : (detail?.projectName ?? "");

  // Header differs by mode: mobile shows back-button, others show X
  const header = (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 shrink-0">
      {mode === "fullpage" ? (
        <>
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal rounded shrink-0"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            {t("panel.back")}
          </button>
          <h2 className="text-sm font-semibold text-slate-800 truncate min-w-0">{headerTitle}</h2>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-slate-800 truncate mr-auto">{headerTitle}</h2>
          <button
            onClick={handleClose}
            aria-label={t("panel.close_label")}
            className="shrink-0 p-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal"
          >
            <X size={18} />
          </button>
        </>
      )}
    </div>
  );

  // Body — stays as placeholder until fase 3D; transition property prepared for tab-switch fade
  const body = (
    <div
      className="flex-1 overflow-y-auto p-6 text-sm text-slate-500"
      style={{ transition: "opacity 100ms ease-in-out" }}
    >
      Inhoud volgt in fase 3D
    </div>
  );

  // ── Full-page mode (mobile <768px) ──────────────────────────────────
  if (mode === "fullpage") {
    return (
      <div
        role="dialog"
        aria-label="Projectdetails"
        aria-modal="true"
        className="fixed inset-0 bg-white z-40 flex flex-col"
        style={{ transition: `opacity ${ANIMATION_MS}ms ease-out`, opacity: isVisible ? 1 : 0 }}
      >
        {header}
        {body}
      </div>
    );
  }

  // ── Drawer (≥1280px) or overlay (<1280px ≥768px) ────────────────────
  const panelWidth = mode === "drawer" ? "75%" : "95%";
  const panelAnimStyle = mode === "drawer"
    ? { transition: `transform ${ANIMATION_MS}ms ease-out`, transform: isVisible ? "translateX(0)" : "translateX(100%)" }
    : { transition: `opacity ${ANIMATION_MS}ms ease-out`, opacity: isVisible ? 1 : 0 };

  return (
    <div
      className="fixed inset-0 z-40"
      style={{
        transition: `background-color ${ANIMATION_MS}ms ease-out`,
        backgroundColor: isVisible ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        role="dialog"
        aria-label="Projectdetails"
        aria-modal="true"
        className="absolute top-0 right-0 h-full bg-white shadow-xl flex flex-col"
        style={{ width: panelWidth, ...panelAnimStyle }}
      >
        {header}
        {body}
      </div>
    </div>
  );
}
