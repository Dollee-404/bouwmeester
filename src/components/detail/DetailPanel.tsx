import { useCallback, useEffect, useRef, useState } from "react";
import { X, ArrowLeft, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { projectDetailService } from "../../data/project-detail-service";
import type { ProjectDetail, ProjectFinancials, ProjectTask, TimesheetMap, ActivityItem as ActivityItemData } from "../../data/detail-types";
import { useMediaQuery } from "../../hooks/use-breakpoint";
import { Button } from "../ui/button";
import { PanelHeader } from "./PanelHeader";
import { KPIBlock } from "./KPIBlock";
import { calcVoortgangKPI, calcBudgetKPI, calcUrenKPI, calcPlanningKPI } from "./kpi-helpers";
import { TabBar, type TabKey } from "./TabBar";
import { PhasesSection } from "./PhasesSection";
import { ActivityItem } from "./ActivityItem";
import { Sidebar } from "./Sidebar";
import { PlanningTab } from "./planning/PlanningTab";

const ANIMATION_MS = 250;

// ── Skeleton helpers ─────────────────────────────────────────────────

function Bone({ className = "" }: { className?: string }) {
  return <div className={`bg-slate-100 rounded ${className}`} />;
}

function PanelSkeleton({ twoColumn }: { twoColumn: boolean }) {
  return (
    <div className="p-6 flex flex-col gap-6 animate-pulse overflow-hidden">
      <div className={`grid gap-3 ${twoColumn ? "grid-cols-4" : "grid-cols-2"}`}>
        {Array.from({ length: 4 }).map((_, i) => <Bone key={i} className="h-20" />)}
      </div>
      <div className={`flex gap-6 ${twoColumn ? "" : "flex-col"}`}>
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <Bone className="h-7 w-48" />
          <Bone className="h-32" />
          <Bone className="h-24" />
          <Bone className="h-24" />
        </div>
        {twoColumn && (
          <div className="flex flex-col gap-4 w-72 shrink-0">
            <Bone className="h-28" />
            <Bone className="h-16" />
            <Bone className="h-24" />
            <Bone className="h-8" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Error state ──────────────────────────────────────────────────────

function PanelError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 p-6 text-center">
      <AlertCircle size={40} className="text-slate-400" />
      <p className="text-sm text-slate-600">{t("errors.server_generic")}</p>
      <Button variant="primary" size="sm" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

interface DetailPanelProps {
  projectId: string;
  onClose: () => void;
}

export function DetailPanel({ projectId, onClose }: DetailPanelProps) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [financials, setFinancials] = useState<ProjectFinancials | null>(null);
  const [timesheets, setTimesheets] = useState<TimesheetMap | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[] | null>(null);
  const [activity, setActivity] = useState<ActivityItemData[] | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overzicht");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMobilePanel = useMediaQuery(768);
  const isNarrowPanel = useMediaQuery(1280);
  const mode = isMobilePanel ? "fullpage" : isNarrowPanel ? "overlay" : "drawer";

  // Trigger enter animation after first paint
  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Save focus on open; restore on close
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    return () => { trigger?.focus(); };
  }, []);

  // Cleanup close timer on unmount
  useEffect(() => {
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, []);

  const handleClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setIsVisible(false);
    closeTimerRef.current = setTimeout(onClose, ANIMATION_MS);
  }, [onClose]);

  const handleRetry = useCallback(() => setRetryKey((k) => k + 1), []);

  // Promise.allSettled — één loading-state voor alle vier calls.
  // Bij ≥1 rejected: error-state voor het hele paneel (future-proof voor partiële UI).
  // cancelled-flag voorkomt state-update na unmount of sluit-animatie.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setDetail(null);
    setFinancials(null);
    setTimesheets(null);
    setTasks(null);
    setActivity(null);

    Promise.allSettled([
      projectDetailService.getProjectDetail(projectId),
      projectDetailService.getProjectFinancials(projectId),
      projectDetailService.getProjectTimesheets(projectId),
      projectDetailService.getProjectTasks(projectId),
      projectDetailService.getProjectActivity(projectId, 10),
    ]).then(([detailRes, financialsRes, timesheetsRes, tasksRes, activityRes]) => {
      if (cancelled) return;
      if (
        detailRes.status === "rejected" ||
        financialsRes.status === "rejected" ||
        timesheetsRes.status === "rejected" ||
        tasksRes.status === "rejected" ||
        activityRes.status === "rejected"
      ) {
        setError(true);
      } else {
        setDetail(detailRes.value);
        setFinancials(financialsRes.value);
        setTimesheets(timesheetsRes.value);
        setTasks(tasksRes.value);
        setActivity(activityRes.value);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [projectId, retryKey]);

  // Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === "Escape") handleClose(); }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  // ── Header: simpel tijdens loading/error, volledig PanelHeader bij data ──
  const headerTitle = loading ? t("common.loading") : t("panel.load_error");

  const simpleHeader = (
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

  const header = detail
    ? <PanelHeader detail={detail} onClose={handleClose} isFullPage={mode === "fullpage"} />
    : simpleHeader;

  const body = (
    <div
      className="flex-1 overflow-y-auto"
      style={{ transition: "opacity 100ms ease-in-out" }}
    >
      {loading ? (
        <PanelSkeleton twoColumn={mode !== "fullpage"} />
      ) : error ? (
        <PanelError onRetry={handleRetry} />
      ) : (
        <div className="flex flex-col">
          {/* KPI-strook */}
          <div className="px-6 pt-6 pb-4">
            <div className={`grid gap-3 ${mode === "drawer" ? "grid-cols-4" : "grid-cols-2"}`}>
              <KPIBlock {...calcVoortgangKPI(detail!, t("kpi.voortgang"))} />
              <KPIBlock {...calcBudgetKPI(detail!, t("kpi.budget"))} />
              <KPIBlock {...calcUrenKPI(detail!, timesheets ?? {}, t("kpi.uren"))} />
              <KPIBlock {...calcPlanningKPI(detail!, t("kpi.planning"))} />
            </div>
          </div>
          {/* Tab-bar — rand-tot-rand */}
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
          {/* Twee-kolom op drawer/overlay, gestackt op fullpage */}
          <div className={`flex flex-1 ${mode !== "fullpage" ? "flex-row" : "flex-col"}`}>
            {/* Linker kolom / hoofdcontent */}
            <div className="flex-1 min-w-0 px-6 pt-4 pb-6">
              {activeTab === "planning" ? (
                <PlanningTab
                  detail={detail!}
                  tasks={tasks ?? []}
                  timesheets={timesheets ?? {}}
                />
              ) : activeTab === "overzicht" ? (
                <div>
                  {/* Fases */}
                  <PhasesSection
                    tasks={tasks ?? []}
                    timesheets={timesheets ?? {}}
                    projectId={projectId}
                    werksoort={detail!.werksoort}
                    onPhasesCreated={handleRetry}
                    mode={mode}
                  />
                  {/* Activiteit */}
                  <div className="mt-8 flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-800">{t("activity.title")}</h3>
                    <button className="text-xs text-y-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal rounded">
                      {t("activity.show_all")}
                    </button>
                  </div>
                  {activity && activity.length > 0 ? (
                    activity.map((item) => <ActivityItem key={item.id} item={item} />)
                  ) : (
                    <p className="text-sm text-slate-400 py-4 text-center">{t("activity.empty")}</p>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-slate-400">
                  {t("tab.not_available")}
                </div>
              )}
            </div>
            {/* Rechter zijbalk */}
            <div className={
              mode !== "fullpage"
                ? "w-72 shrink-0 border-l border-slate-100 pt-4 pb-6 pl-5 pr-6"
                : "px-6 pt-2 pb-6"
            }>
              <Sidebar detail={detail!} financials={financials} />
            </div>
          </div>
        </div>
      )}
    </div>
  );

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
