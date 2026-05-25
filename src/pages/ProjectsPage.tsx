import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, LayoutGrid, List, Plus, AlertCircle, Loader2, HardHat, SearchX } from "lucide-react";
import { EmptyState } from "../components/ui/empty-state";
import { useProjects } from "../hooks/use-projects";
import { useBreakpoint } from "../hooks/use-breakpoint";
import { projectsService } from "../data";
import type { BouwmeesterStatus, Project } from "../data/types";
import { KanbanBoard } from "../components/kanban/KanbanBoard";
import { ProjectsTable } from "../components/projects/ProjectsTable";
import { ProjectsCardList } from "../components/projects/ProjectsCardList";
import { NewProjectWizard } from "../components/projects/NewProjectWizard";
import { useUnlinkedQuotations } from "../hooks/use-unlinked-quotations";
import { DoordrukkenWizard } from "../components/projects/DoordrukkenWizard";
import type { UnlinkedQuotation } from "../data/detail-types";
import { DetailPanel } from "../components/detail/DetailPanel";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Toggle } from "../components/ui/toggle";
import { useToast } from "../components/ui/toast";

type ViewMode = "board" | "table" | "card-list";

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
  const { quotations: unlinkedQuotations, refetch: refetchQuotations } = useUnlinkedQuotations();
  const [doordrukkenQuotation, setDoordrukkenQuotation] = useState<UnlinkedQuotation | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const { isTablet, isMobile } = useBreakpoint();

  // Under 768px the board is not usable — show grouped card list instead
  const effectiveViewMode: ViewMode = isTablet ? "card-list" : viewMode;

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

  const handleProjectClick = useCallback((project: Project) => {
    setSelectedProjectId(project.id);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedProjectId(null);
  }, []);

  function handleWizardCreated(projectId: string) {
    setWizardOpen(false);
    refetch();
    setSelectedProjectId(projectId);
  }

  function handleDoordrukkenCreated(projectId: string) {
    setDoordrukkenQuotation(null);
    refetchQuotations();
    refetch();
    setSelectedProjectId(projectId);
  }

  async function handleStatusChange(projectId: string, newStatus: BouwmeesterStatus) {
    await projectsService.updateStatus(projectId, newStatus);
    refetch();
  }

  return (
    <main className="flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-100">
        <div className="flex items-center gap-3 px-6 py-4 flex-wrap">
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

          {!isMobile && (
            <Input
              icon={<Search size={14} />}
              placeholder={t("projects.search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56"
            />
          )}
          <Button
            variant={showArchived ? "primary" : "secondary"}
            size="sm"
            onClick={() => setShowArchived((v) => !v)}
          >
            {t("projects.show_archived")}
          </Button>
          {!isTablet && (
            <Toggle
              options={["Board", "Tabel"]}
              value={viewMode === "board" ? "Board" : "Tabel"}
              onChange={(v) => setViewMode(v === "Board" ? "board" : "table")}
              icons={[<LayoutGrid size={13} key="b" />, <List size={13} key="t" />]}
            />
          )}
          <Button variant="primary" size="sm" onClick={() => setWizardOpen(true)}>
            <Plus size={14} aria-hidden="true" />
            {t("projects.new")}
          </Button>
        </div>

        {/* Mobile: full-width search below title row */}
        {isMobile && (
          <div className="px-6 pb-4">
            <Input
              icon={<Search size={14} />}
              placeholder={t("projects.search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        )}
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
              <Button variant="primary" size="sm" onClick={() => setWizardOpen(true)}>
                <Plus size={14} aria-hidden="true" />
                {t("projects.new")}
              </Button>
            }
          />
        </div>
      )}
      {!loading && !error && projects.length > 0 && searchQuery.trim() !== "" && filtered.length === 0 && (
        <div className="px-6 pt-4 pb-6">
          <EmptyState
            icon={<SearchX size={48} className="text-slate-400" />}
            title={t("projects.empty_no_search_results_title")}
            description={t("projects.empty_no_search_results_body", { query: searchQuery })}
            action={
              <Button variant="secondary" size="sm" onClick={() => setSearchQuery("")}>
                {t("projects.clear_search")}
              </Button>
            }
          />
        </div>
      )}
      {(loading || filtered.length > 0 || (error && projects.length > 0)) && effectiveViewMode === "board" && (
        <div className="px-6 pt-4 pb-6">
          <KanbanBoard
            projects={filtered}
            showArchived={showArchived}
            isLoading={loading && !isRefetching}
            onCardClick={handleProjectClick}
            onAddNew={() => setWizardOpen(true)}
            onStatusChange={handleStatusChange}
            unlinkedQuotations={unlinkedQuotations}
            onDoordrukken={setDoordrukkenQuotation}
          />
        </div>
      )}
      {(loading || filtered.length > 0 || (error && projects.length > 0)) && effectiveViewMode === "table" && (
        <div className="px-6 pt-4 pb-6">
          <ProjectsTable
            projects={filtered}
            isLoading={loading && !isRefetching}
            onRowClick={handleProjectClick}
          />
        </div>
      )}
      {(loading || filtered.length > 0 || (error && projects.length > 0)) && effectiveViewMode === "card-list" && (
        <div className="pt-2 pb-6">
          <ProjectsCardList
            projects={filtered}
            showArchived={showArchived}
            isLoading={loading && !isRefetching}
            onCardClick={handleProjectClick}
          />
        </div>
      )}
      {selectedProjectId && (
        <DetailPanel projectId={selectedProjectId} onClose={handleClose} />
      )}
      {wizardOpen && (
        <NewProjectWizard
          onClose={() => setWizardOpen(false)}
          onCreated={handleWizardCreated}
        />
      )}
      {doordrukkenQuotation && (
        <DoordrukkenWizard
          quotation={doordrukkenQuotation}
          onClose={() => setDoordrukkenQuotation(null)}
          onCreated={handleDoordrukkenCreated}
        />
      )}
    </main>
  );
}
