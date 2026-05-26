# ProjectsTable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ProjectsTablePlaceholder with a real, sortable, filterable projects table in src/components/projects/ProjectsTable.tsx.

**Architecture:** A single self-contained `ProjectsTable` component that accepts the same `projects` array already filtered by ProjectsPage (search + archived). The component owns its own sorting state (column + direction, 3-state) and werksoort dropdown filter. Sorting and filtering are pure in-memory transforms on the incoming projects prop.

**Tech Stack:** React, TypeScript, Tailwind CSS, react-i18next, existing WerksoortBadge, Avatar, STATUS_COLORS, STATUS_ORDER from the codebase.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/projects/ProjectsTable.tsx` | Full table: header with sort controls + werksoort dropdown, body rows, empty-state row |
| Modify | `src/pages/ProjectsPage.tsx` | Swap import + JSX from ProjectsTablePlaceholder → ProjectsTable; pass `projects`, `onRowClick` |
| Delete | `src/components/projects/ProjectsTablePlaceholder.tsx` | No longer needed |
| Modify | `src/i18n/nl.json` | Add table column header + werksoort filter keys |
| Modify | `src/i18n/en.json` | Same keys in English |

---

### Task 1: Add i18n keys for table

**Files:**
- Modify: `src/i18n/nl.json`
- Modify: `src/i18n/en.json`

- [ ] **Step 1: Add Dutch keys to nl.json**

In `src/i18n/nl.json`, inside the `"projects"` object, add after `"back_to_board"`:

```json
"table_col_id": "Nr.",
"table_col_name": "Naam",
"table_col_customer": "Klant",
"table_col_status": "Status",
"table_col_werksoort": "Werksoort",
"table_col_start": "Start",
"table_col_end": "Eind",
"table_col_progress": "Voortgang",
"table_col_budget": "Budget",
"table_col_manager": "Projectleider",
"werksoort_filter_all": "Alle werksoorten",
"werksoort_filter_none": "Geen werksoort"
```

- [ ] **Step 2: Add English keys to en.json**

In `src/i18n/en.json`, inside the `"projects"` object, add after `"back_to_board"`:

```json
"table_col_id": "No.",
"table_col_name": "Name",
"table_col_customer": "Client",
"table_col_status": "Status",
"table_col_werksoort": "Work type",
"table_col_start": "Start",
"table_col_end": "End",
"table_col_progress": "Progress",
"table_col_budget": "Budget",
"table_col_manager": "Project manager",
"werksoort_filter_all": "All work types",
"werksoort_filter_none": "No work type"
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/eelke/Documenten/Github/Y-App/bouwmeester && npx tsc --noEmit
```
Expected: no errors.

---

### Task 2: Create ProjectsTable component

**Files:**
- Create: `src/components/projects/ProjectsTable.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/projects/ProjectsTable.tsx` with this complete content:

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronUp, ChevronDown } from "lucide-react";
import { WerksoortBadge } from "../ui/badge";
import { Avatar } from "../ui/avatar";
import type { Project, BouwmeesterStatus, Werksoort } from "../../data/types";
import { STATUS_COLORS } from "../../lib/status-colors";
import { STATUS_ORDER, ARCHIVED_STATUS_ORDER } from "../kanban/status-config";

const FULL_STATUS_ORDER: BouwmeesterStatus[] = [...STATUS_ORDER, ...ARCHIVED_STATUS_ORDER];

type SortKey = "id" | "projectName" | "status" | "budgetSales";
type SortDir = "asc" | "desc" | "none";

interface ProjectsTableProps {
  projects: Project[];
  onRowClick: (project: Project) => void;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey || sortDir === "none") return null;
  return sortDir === "asc"
    ? <ChevronUp size={12} className="inline ml-1 shrink-0" />
    : <ChevronDown size={12} className="inline ml-1 shrink-0" />;
}

function sortProjects(projects: Project[], key: SortKey, dir: SortDir): Project[] {
  if (dir === "none") return projects;

  const statusIndex = (s: BouwmeesterStatus) => FULL_STATUS_ORDER.indexOf(s);

  return [...projects].sort((a, b) => {
    let cmp = 0;
    if (key === "id") {
      cmp = a.id.localeCompare(b.id);
    } else if (key === "projectName") {
      cmp = a.projectName.localeCompare(b.projectName, "nl");
    } else if (key === "status") {
      cmp = statusIndex(a.status) - statusIndex(b.status);
    } else if (key === "budgetSales") {
      const av = a.budgetSales ?? null;
      const bv = b.budgetSales ?? null;
      if (av === null && bv === null) cmp = 0;
      else if (av === null) return 1;
      else if (bv === null) return -1;
      else cmp = av - bv;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

export function ProjectsTable({ projects, onRowClick }: ProjectsTableProps) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("none");
  const [werksoortFilter, setWerksoortFilter] = useState<Werksoort | "all" | "none">("all");

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("none");
    } else {
      setSortDir("asc");
    }
  }

  const filtered = projects.filter((p) => {
    if (werksoortFilter === "none") return p.werksoort === null;
    if (werksoortFilter !== "all") return p.werksoort === werksoortFilter;
    return true;
  });

  const sorted = sortProjects(filtered, sortKey, sortDir);

  const werksoortOptions: { value: string; label: string }[] = [
    { value: "all",       label: t("projects.werksoort_filter_all") },
    { value: "Renovatie", label: t("werksoort.renovatie") },
    { value: "Nieuwbouw", label: t("werksoort.nieuwbouw") },
    { value: "Sloop",     label: t("werksoort.sloop") },
    { value: "Verbouw",   label: t("werksoort.verbouw") },
    { value: "Onderhoud", label: t("werksoort.onderhoud") },
    { value: "none",      label: t("projects.werksoort_filter_none") },
  ];

  function thClass(sortable: boolean) {
    return [
      "px-3 py-2 text-left text-sm font-semibold text-slate-600 whitespace-nowrap select-none",
      sortable ? "cursor-pointer hover:text-slate-900" : "",
    ].join(" ");
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-white sticky top-0 z-10">
            <th className={thClass(true)} onClick={() => handleSort("id")}>
              {t("projects.table_col_id")}
              <SortIcon col="id" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className={thClass(true)} onClick={() => handleSort("projectName")}>
              {t("projects.table_col_name")}
              <SortIcon col="projectName" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className={thClass(false)}>{t("projects.table_col_customer")}</th>
            <th className={thClass(true)} onClick={() => handleSort("status")}>
              {t("projects.table_col_status")}
              <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-slate-600">
              <div className="flex items-center gap-2">
                <span>{t("projects.table_col_werksoort")}</span>
                <select
                  value={werksoortFilter}
                  onChange={(e) => setWerksoortFilter(e.target.value as Werksoort | "all" | "none")}
                  className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700 font-normal focus:outline-none focus:ring-1 focus:ring-y-teal"
                  onClick={(e) => e.stopPropagation()}
                >
                  {werksoortOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </th>
            <th className={thClass(false)}>{t("projects.table_col_start")}</th>
            <th className={thClass(false)}>{t("projects.table_col_end")}</th>
            <th className={thClass(false)}>{t("projects.table_col_progress")}</th>
            <th className={thClass(true)} onClick={() => handleSort("budgetSales")}>
              {t("projects.table_col_budget")}
              <SortIcon col="budgetSales" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className={thClass(false)}>{t("projects.table_col_manager")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-3 py-6 text-center text-sm text-slate-400">
                {t("projects.no_results")}
              </td>
            </tr>
          ) : (
            sorted.map((p) => {
              const color = STATUS_COLORS[p.status];
              const budgetPct = p.budgetSales > 0 ? p.billedAmount / p.budgetSales : 0;
              const budgetOver = p.billedAmount > p.budgetSales;
              return (
                <tr
                  key={p.id}
                  className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer"
                  onClick={() => onRowClick(p)}
                >
                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {p.id}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-slate-900 whitespace-nowrap max-w-[220px] truncate">
                    {p.projectName}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap max-w-[160px] truncate">
                    {p.customerName}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-slate-700">{t(`status.${p.status.toLowerCase().replace(/ /g, "_")}`)}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <WerksoortBadge werksoort={p.werksoort} />
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(p.startDate)}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(p.endDate)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(p.percentComplete, 100)}%`,
                            backgroundColor: p.percentComplete === 100 ? "#1D9E75" : "#378ADD",
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 shrink-0">{p.percentComplete}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="text-xs">
                      <span className={budgetOver ? "text-red-600 font-medium" : "text-slate-700"}>
                        {formatEuro(p.billedAmount)}
                      </span>
                      <span className="text-slate-400"> / </span>
                      <span className="text-slate-500">{formatEuro(p.budgetSales)}</span>
                    </div>
                    <div className="mt-0.5 h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(budgetPct * 100, 100)}%`,
                          backgroundColor: budgetOver ? "#dc2626" : "#1D9E75",
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {p.projectManager ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar name={p.projectManager} size="xs" />
                        <span className="text-slate-700 text-xs">{p.projectManager}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/eelke/Documenten/Github/Y-App/bouwmeester && npx tsc --noEmit
```
Expected: no errors.

---

### Task 3: Wire ProjectsTable into ProjectsPage and remove placeholder

**Files:**
- Modify: `src/pages/ProjectsPage.tsx`
- Delete: `src/components/projects/ProjectsTablePlaceholder.tsx`

- [ ] **Step 1: Update ProjectsPage.tsx**

Replace the import of `ProjectsTablePlaceholder` and its usage. The complete updated file:

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, LayoutGrid, List, Plus } from "lucide-react";
import { useProjects } from "../hooks/use-projects";
import { projectsService } from "../data";
import type { BouwmeesterStatus, Project } from "../data/types";
import { KanbanBoard } from "../components/kanban/KanbanBoard";
import { ProjectsTable } from "../components/projects/ProjectsTable";
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

  const activeCount = projects.filter((p) => !p.isArchived).length;
  const archivedCount = projects.filter((p) => p.isArchived).length;

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
        <div className="px-6 pt-4 pb-6">
          <ProjectsTable projects={filtered} onRowClick={handleRowClick} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add `detail_coming_soon` i18n key**

In `src/i18n/nl.json` add inside `"projects"`:
```json
"detail_coming_soon": "Detailweergave komt in een latere versie"
```
In `src/i18n/en.json` add inside `"projects"`:
```json
"detail_coming_soon": "Detail view coming in a later version"
```

- [ ] **Step 3: Delete ProjectsTablePlaceholder.tsx**

```bash
rm /home/eelke/Documenten/Github/Y-App/bouwmeester/src/components/projects/ProjectsTablePlaceholder.tsx
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/eelke/Documenten/Github/Y-App/bouwmeester && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/eelke/Documenten/Github/Y-App/bouwmeester
git add src/components/projects/ProjectsTable.tsx src/pages/ProjectsPage.tsx src/i18n/nl.json src/i18n/en.json
git rm src/components/projects/ProjectsTablePlaceholder.tsx
git commit -m "Fase 5: ProjectsTable met sortering, werksoort-filter en budget-balk"
```

---

## Self-Review

**Spec coverage:**
- ✓ Alle 10 kolommen aanwezig in de juiste volgorde
- ✓ Sorteerbaarheid: id, projectName, status, budgetSales (3-state)
- ✓ Status-sortering op levenscyclus-volgorde via FULL_STATUS_ORDER
- ✓ Nulls onderaan bij budgetSales-sort
- ✓ Werksoort-filter dropdown in header met "Geen werksoort" optie
- ✓ Sticky header (position sticky + z-10 + bg-white)
- ✓ Hover-rij slate-50
- ✓ Borders border-slate-200
- ✓ px-3 py-2.5 rij-padding
- ✓ text-sm body tekst
- ✓ Zoekveld en archived-toggle van ProjectsPage filteren de `projects` prop al vóór de tabel ze ziet
- ✓ Werksoort-filter tabel-eigen, beïnvloedt board niet
- ✓ Row-klik → toast via `onRowClick` callback
- ✓ Lege staat: colspan=10 rij met "Geen projecten gevonden"
- ✓ Horizontaal scrollbaar wrapper (overflow-x-auto)
- ✓ Geen paginatie, bulk-selectie, export, andere kolomfilters

**Placeholder scan:** geen TBD/TODO in de code.

**Type consistency:** `SortKey`, `SortDir`, `Project`, `BouwmeesterStatus`, `Werksoort` consistent door het hele component.
