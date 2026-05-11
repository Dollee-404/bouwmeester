import { useState } from "react";
import { X, ChevronLeft, ExternalLink, ChevronRight, Clock } from "lucide-react";
import { Avatar } from "../../ui/avatar";
import { Badge } from "../../ui/badge";
import { useMediaQuery } from "../../../hooks/use-breakpoint";
import { ERPNEXT_URL } from "../../../bridge";
import type { ProjectTask, TimesheetMap } from "../../../data/detail-types";

export interface TaskDetailPaneelProps {
  tasks: ProjectTask[];
  timesheets: TimesheetMap;
  initialId: string;
  initialMode: "task" | "phase";
  onClose: () => void;
}

interface NavEntry {
  id: string;
  mode: "task" | "phase";
}

// ── Hulpfuncties ──────────────────────────────────────────────────────────────

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function fmtEmail(email: string): string {
  const local = email.split("@")[0].replace(/[._-]/g, " ");
  return local.replace(/\b\w/g, (c) => c.toUpperCase());
}

function taskStatusVariant(status: string): "neutral" | "warning" | "success" | "danger" {
  if (status === "Completed") return "success";
  if (status === "Working") return "warning";
  if (status === "Overdue") return "danger";
  return "neutral";
}

function taskStatusLabel(status: string): string {
  if (status === "Open") return "Open";
  if (status === "Working") return "In werk";
  if (status === "Completed") return "Gereed";
  if (status === "Cancelled") return "Geannuleerd";
  if (status === "Overdue") return "Achterstallig";
  return status;
}

// ── Voortgangsbalk ────────────────────────────────────────────────────────────

function ProgressBar({ pct, color = "#4d8c8a" }: { pct: number; color?: string }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── Datum-rij ─────────────────────────────────────────────────────────────────

function DateRow({ label, start, end }: { label: string; start: Date | null; end: Date | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-700 text-right">
        {fmtDate(start)}
        {(start || end) && " – "}
        {fmtDate(end)}
      </span>
    </div>
  );
}

// ── Task-modus inhoud ─────────────────────────────────────────────────────────

function TaskInhoud({
  task,
  tasks,
  timesheets,
  onNavigate,
}: {
  task: ProjectTask;
  tasks: ProjectTask[];
  timesheets: TimesheetMap;
  onNavigate: (id: string, mode: "task" | "phase") => void;
}) {
  const besteed = timesheets[task.id] ?? 0;
  const budget = task.budgetHours;
  const urenPct = budget && budget > 0 ? (besteed / budget) * 100 : null;

  return (
    <div className="flex flex-col gap-5 p-5 overflow-y-auto">
      {/* Status */}
      <div className="flex items-center gap-2">
        <Badge variant={taskStatusVariant(task.status)} size="xs">
          {taskStatusLabel(task.status)}
        </Badge>
        {task.isMilestone && (
          <Badge variant="info" size="xs">
            Mijlpaal
          </Badge>
        )}
      </div>

      {/* Toegewezen */}
      {task.assignedTo.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Toegewezen aan
          </p>
          <div className="flex flex-wrap gap-2">
            {task.assignedTo.map((email) => (
              <div key={email} className="flex items-center gap-1.5">
                <Avatar name={fmtEmail(email)} size="sm" />
                <span className="text-sm text-slate-700">{fmtEmail(email)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Datums */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Planning
        </p>
        <div className="flex flex-col gap-1.5">
          <DateRow label="Gepland" start={task.expectedStartDate} end={task.expectedEndDate} />
          {(task.actualStartDate || task.actualEndDate) && (
            <DateRow label="Werkelijk" start={task.actualStartDate} end={task.actualEndDate} />
          )}
        </div>
      </div>

      {/* Voortgang + uren */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Voortgang
          </p>
          <span className="text-xs text-slate-600">{task.progress}%</span>
        </div>
        <ProgressBar pct={task.progress} />
        {(besteed > 0 || budget) && (
          <p className="mt-1.5 text-xs text-slate-500">
            {besteed.toFixed(1)} uur besteed
            {budget ? ` / ${budget} uur begroot` : ""}
            {urenPct !== null && urenPct > 80 && task.progress < 80 && (
              <span className="ml-1 text-amber-600">(uren lopen uit)</span>
            )}
          </p>
        )}
      </div>

      {/* Beschrijving */}
      {task.description && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Omschrijving
          </p>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {task.description}
          </p>
        </div>
      )}

      {/* Wacht op — placeholder voor 4F */}
      {task.wachtOp && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Wacht op
          </p>
          <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 bg-amber-100">
            <Clock size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">{task.wachtOp}</p>
              {task.wachtOpToelichting && (
                <p className="text-xs text-amber-700 mt-0.5">{task.wachtOpToelichting}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Afhankelijkheden */}
      {task.dependsOn.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Afhankelijk van
          </p>
          <div className="flex flex-col gap-1">
            {task.dependsOn.map((depId) => {
              const dep = tasks.find((t) => t.id === depId);
              return (
                <button
                  key={depId}
                  type="button"
                  onClick={() => onNavigate(depId, dep?.isGroup ? "phase" : "task")}
                  className="flex items-center justify-between gap-2 text-sm text-y-teal-dark hover:underline text-left"
                >
                  <span>{dep?.subject ?? depId}</span>
                  <ChevronRight size={14} className="shrink-0 text-slate-400" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Fase-modus inhoud ─────────────────────────────────────────────────────────

function FaseInhoud({
  fase,
  tasks,
  onNavigate,
}: {
  fase: ProjectTask;
  tasks: ProjectTask[];
  onNavigate: (id: string, mode: "task" | "phase") => void;
}) {
  const subTasks = tasks.filter((t) => t.parentTask === fase.id);

  return (
    <div className="flex flex-col gap-5 p-5 overflow-y-auto">
      {/* Status */}
      <div>
        <Badge variant={taskStatusVariant(fase.status)} size="xs">
          {taskStatusLabel(fase.status)}
        </Badge>
      </div>

      {/* Datums */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Planning
        </p>
        <div className="flex flex-col gap-1.5">
          <DateRow label="Gepland" start={fase.expectedStartDate} end={fase.expectedEndDate} />
          {(fase.actualStartDate || fase.actualEndDate) && (
            <DateRow label="Werkelijk" start={fase.actualStartDate} end={fase.actualEndDate} />
          )}
        </div>
      </div>

      {/* Voortgang */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Voortgang
          </p>
          <span className="text-xs text-slate-600">{fase.progress}%</span>
        </div>
        <ProgressBar pct={fase.progress} />
        {fase.budgetHours && (
          <p className="mt-1.5 text-xs text-slate-500">
            {fase.budgetHours} uur begroot
          </p>
        )}
      </div>

      {/* Beschrijving */}
      {fase.description && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Omschrijving
          </p>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {fase.description}
          </p>
        </div>
      )}

      {/* Sub-taken */}
      {subTasks.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Taken in deze fase ({subTasks.length})
          </p>
          <div className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
            {subTasks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onNavigate(t.id, "task")}
                className="flex items-center justify-between gap-2 px-4 py-3 text-sm text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{t.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.progress}% gereed</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={taskStatusVariant(t.status)} size="xs">
                    {taskStatusLabel(t.status)}
                  </Badge>
                  <ChevronRight size={14} className="text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {subTasks.length === 0 && (
        <p className="text-sm text-slate-400">Geen taken gekoppeld aan deze fase.</p>
      )}
    </div>
  );
}

// ── Hoofd-component ───────────────────────────────────────────────────────────

export function TaskDetailPaneel({
  tasks,
  timesheets,
  initialId,
  initialMode,
  onClose,
}: TaskDetailPaneelProps) {
  const [stack, setStack] = useState<NavEntry[]>([{ id: initialId, mode: initialMode }]);
  const isNarrow = useMediaQuery(1280);

  const current = stack[stack.length - 1];
  const task = tasks.find((t) => t.id === current.id);

  function navigate(id: string, mode: "task" | "phase") {
    setStack((s) => [...s, { id, mode }]);
  }

  function goBack() {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }

  const canGoBack = stack.length > 1;
  const erpLink = task ? `${ERPNEXT_URL}/app/task/${encodeURIComponent(task.id)}` : null;

  // ── Header ──

  function PanelHeader() {
    return (
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 shrink-0">
        {canGoBack && (
          <button
            type="button"
            onClick={goBack}
            className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-500"
            aria-label="Terug"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <h2 className="flex-1 text-sm font-semibold text-slate-900 truncate min-w-0">
          {task?.subject ?? current.id}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-500 shrink-0"
          aria-label="Sluiten"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  // ── Footer ──

  function PanelFooter() {
    if (!erpLink || !ERPNEXT_URL) return null;
    return (
      <div className="shrink-0 px-5 py-3 border-t border-slate-200">
        <a
          href={erpLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-y-teal-dark hover:underline"
        >
          <ExternalLink size={13} />
          Open in ERPNext
        </a>
      </div>
    );
  }

  // ── Inhoud ──

  function PanelBody() {
    if (!task) {
      return (
        <div className="p-5 text-sm text-slate-400">
          Taak niet gevonden ({current.id})
        </div>
      );
    }
    if (current.mode === "phase") {
      return (
        <FaseInhoud
          fase={task}
          tasks={tasks}
          onNavigate={navigate}
        />
      );
    }
    return (
      <TaskInhoud
        task={task}
        tasks={tasks}
        timesheets={timesheets}
        onNavigate={navigate}
      />
    );
  }

  // ── Bottom-sheet layout (<1280px) ──

  if (isNarrow) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
        {/* Sheet */}
        <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-white rounded-t-2xl shadow-2xl max-h-[70vh]">
          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-300" />
          </div>
          <PanelHeader />
          <div className="flex-1 overflow-y-auto">
            <PanelBody />
          </div>
          <PanelFooter />
        </div>
      </>
    );
  }

  // ── Side-panel layout (≥1280px) ──

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed right-0 top-0 h-full w-96 z-50 flex flex-col bg-white border-l border-slate-200 shadow-2xl">
        <PanelHeader />
        <div className="flex-1 overflow-y-auto">
          <PanelBody />
        </div>
        <PanelFooter />
      </div>
    </>
  );
}
