import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, LayoutGrid, List, Plus, AlertCircle, Loader2, HardHat } from "lucide-react";
import { EmptyState } from "../components/ui/empty-state";
import { useProjects } from "../hooks/use-projects";
import { projectsService } from "../data";
import type { BouwmeesterStatus, Project } from "../data/types";
import { KanbanBoard } from "../components/kanban/KanbanBoard";
import { ProjectsTable } from "../components/projects/ProjectsTable";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Toggle } from "../components/ui/toggle";
import { useToast } from "../components/ui/toast";

type ViewMode = "board" | "table";

function classifyError(e: Error): "bridge" | "server" | "unknown" {
  const msg = e.message;
  if (msg.includes("timeout") || msg.includes("Bridge")) return "bridge";
  if (/\b[45]\d\d\b/.test(msg) || msg.toLowerCase().includes("erpnext error")) return "server";
  return "unknown";
}

export function ProjectsPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { projects, loading, isRefetching, error, refetch } = useProjects({ includeArchived: true });

  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("board");

  const shownErrorRef = useRef<Error | null>(null);
  useEffect(() => {
    if (!error || error === shownErrorRef.current) return;
    shownErrorRef.current = error;
    const kind = classifyError(error);
    if (kind === "bridge") {
      addToast(t("errors.bridge_lost"), "error");
    } else if (kind === "server") {
      addToast(error.message || t("errors.server_generic"), "error");
    } else {
      addToast(t("errors.unexpected"), "error");
    }
  }, [error, addToast, t]);

  // Counts gebaseerd op totaal (niet op gefilterd resultaat)
  const activeCount = projects.filter((p) => !p.isArchived).length;
  const archivedCount = projects.filter((p) => p.isArchived).length;

  // Client-side filter voor weergave
  const filtered = projects.filter((p) => {
    if (!showArchived && p.isArchived) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !p.projectName.toLowerCase().includes(q) &&
        !p.customerName.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  function notAvailable() {
    addToast(t("common.not_available"), "info");
  }

  function handleRowClick(_project: Project) {
    addToast(t("projects.detail_coming_soon"), "info");
  }

  async function handleStatusChange(projectId: string, newStatus: BouwmeesterStatus) {
    await projectsService.updateStatus(projectId, newStatus);
    refetch();
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 flex-wrap border-b border-slate-100">
        <div className="flex flex-col mr-auto min-w-0">
          <h1 className="text-xl font-bold text-slate-800">{t("projects.title")}</h1>
          <p className="text-sm text-slate-500 flex items-center gap-1.5">
            {loading && !isRefetching ? "—" : (
              <>
                {t("projects.active_count", { count: activeCount })}
                {" · "}
                {t("projects.archived_count", { count: archivedCount })}
                {isRefetching && <Loader2 size={12} className="animate-spin text-slate-400" />}
              </>
            )}
          </p>
        </div>

        <Input
          icon={<Search size={14} />}
          placeholder={t("projects.search_placeholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-56"
        />
        <Button
          variant={showArchived ? "primary" : "secondary"}
          size="sm"
          onClick={() => setShowArchived((v) => !v)}
        >
          {t("projects.show_archived")}
        </Button>
        <Toggle
          options={["Board", "Tabel"]}
          value={viewMode === "board" ? "Board" : "Tabel"}
          onChange={(v) => setViewMode(v === "Board" ? "board" : "table")}
          icons={[<LayoutGrid size={13} key="b" />, <List size={13} key="t" />]}
        />
        <Button variant="primary" size="sm" onClick={notAvailable}>
          <Plus size={14} />
          {t("projects.new")}
        </Button>
      </div>

      {/* Content */}
      {!loading && error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <AlertCircle size={48} className="text-slate-400 mb-4" />
          <h2 className="text-base font-semibold text-slate-700">
            {t("errors.projects_load_failed_title")}
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-sm">{error.message}</p>
          <Button variant="primary" size="sm" className="mt-6" onClick={refetch}>
            {t("errors.try_again")}
          </Button>
        </div>
      )}
      {!loading && !error && projects.length === 0 && (
        <div className="px-6 pt-4 pb-6">
          <EmptyState
            icon={<HardHat size={64} className="text-slate-400" />}
            title={t("projects.empty_no_projects_title")}
            description={t("projects.empty_no_projects_body")}
            action={
              <Button variant="primary" size="sm" onClick={notAvailable}>
                <Plus size={14} />
                {t("projects.new")}
              </Button>
            }
          />
        </div>
      )}
      {(loading || filtered.length > 0 || (error && projects.length > 0)) && viewMode === "board" && (
        <div className="px-6 pt-4 pb-6">
          <KanbanBoard
            projects={filtered}
            showArchived={showArchived}
            isLoading={loading && !isRefetching}
            onAddNew={notAvailable}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}
      {(loading || filtered.length > 0 || (error && projects.length > 0)) && viewMode === "table" && (
        <div className="px-6 pt-4 pb-6">
          <ProjectsTable
            projects={filtered}
            isLoading={loading && !isRefetching}
            onRowClick={handleRowClick}
          />
        </div>
      )}
    </div>
  );
}
