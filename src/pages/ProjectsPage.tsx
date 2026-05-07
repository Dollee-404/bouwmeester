import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, LayoutGrid, List, Plus } from "lucide-react";
import { useProjects } from "../hooks/use-projects";
import { projectsService } from "../data";
import type { BouwmeesterStatus } from "../data/types";
import { KanbanBoard } from "../components/kanban/KanbanBoard";
import { ProjectsTablePlaceholder } from "../components/projects/ProjectsTablePlaceholder";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Toggle } from "../components/ui/toggle";
import { LoadingState } from "../components/ui/loading-state";
import { useToast } from "../components/ui/toast";

type ViewMode = "board" | "table";

export function ProjectsPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { projects, loading, error, refetch } = useProjects({ includeArchived: true });

  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("board");

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
          {!loading && (
            <p className="text-sm text-slate-500">
              {t("projects.active_count", { count: activeCount })}
              {" · "}
              {t("projects.archived_count", { count: archivedCount })}
            </p>
          )}
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
      {loading && (
        <div className="p-8">
          <LoadingState message={t("common.loading")} />
        </div>
      )}
      {error && (
        <div className="px-6 py-4">
          <span className="text-sm text-red-600 font-mono">{error.message}</span>
        </div>
      )}
      {!loading && !error && viewMode === "board" && (
        <div className="px-6 pt-4 pb-6">
          <KanbanBoard
            projects={filtered}
            showArchived={showArchived}
            onAddNew={notAvailable}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}
      {!loading && !error && viewMode === "table" && (
        <ProjectsTablePlaceholder onBack={() => setViewMode("board")} />
      )}
    </div>
  );
}
