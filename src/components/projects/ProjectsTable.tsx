import { useState } from "react";
import type React from "react";
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
  isLoading?: boolean;
  onRowClick: (project: Project) => void;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey || sortDir === "none") return null;
  return sortDir === "asc"
    ? <ChevronUp size={12} className="inline ml-1 shrink-0" aria-hidden="true" />
    : <ChevronDown size={12} className="inline ml-1 shrink-0" aria-hidden="true" />;
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

export function ProjectsTable({ projects, isLoading = false, onRowClick }: ProjectsTableProps) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("none");
  const [werksoortFilter, setWerksoortFilter] = useState<Werksoort | "all" | "none">("all");

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir(key === "budgetSales" ? "desc" : "asc");
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

  function thClass(sortable: boolean, key?: SortKey) {
    const isActive = key !== undefined && sortKey === key && sortDir !== "none";
    return [
      "px-3 py-2 text-left text-sm font-semibold whitespace-nowrap select-none",
      isActive ? "text-slate-900 bg-slate-50" : "text-slate-600",
      sortable ? "cursor-pointer hover:text-slate-900 hover:bg-slate-50" : "",
    ].join(" ");
  }

  function ariaSortFor(key: SortKey): React.AriaAttributes["aria-sort"] {
    if (sortKey !== key || sortDir === "none") return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-white sticky top-0 z-10">
            <th className={thClass(true, "id")} onClick={() => handleSort("id")} aria-sort={ariaSortFor("id")}>
              {t("projects.table_col_id")}
              <SortIcon col="id" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className={thClass(true, "projectName")} onClick={() => handleSort("projectName")} aria-sort={ariaSortFor("projectName")}>
              {t("projects.table_col_name")}
              <SortIcon col="projectName" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className={thClass(false)}>{t("projects.table_col_customer")}</th>
            <th className={thClass(true, "status")} onClick={() => handleSort("status")} aria-sort={ariaSortFor("status")}>
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
            <th className={thClass(true, "budgetSales")} onClick={() => handleSort("budgetSales")} aria-sort={ariaSortFor("budgetSales")}>
              {t("projects.table_col_budget")}
              <SortIcon col="budgetSales" sortKey={sortKey} sortDir={sortDir} />
            </th>
            <th className={thClass(false)}>{t("projects.table_col_manager")}</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-200">
                <td className="px-3 py-2.5"><div className="h-3 w-16 bg-slate-200 rounded animate-pulse" /></td>
                <td className="px-3 py-2.5"><div className="h-3 w-40 bg-slate-200 rounded animate-pulse" /></td>
                <td className="px-3 py-2.5"><div className="h-3 w-28 bg-slate-200 rounded animate-pulse" /></td>
                <td className="px-3 py-2.5"><div className="h-3 w-24 bg-slate-200 rounded animate-pulse" /></td>
                <td className="px-3 py-2.5"><div className="h-4 w-16 bg-slate-200 rounded-full animate-pulse" /></td>
                <td className="px-3 py-2.5"><div className="h-3 w-20 bg-slate-200 rounded animate-pulse" /></td>
                <td className="px-3 py-2.5"><div className="h-3 w-20 bg-slate-200 rounded animate-pulse" /></td>
                <td className="px-3 py-2.5"><div className="h-2 w-20 bg-slate-200 rounded-full animate-pulse" /></td>
                <td className="px-3 py-2.5"><div className="h-3 w-24 bg-slate-200 rounded animate-pulse" /></td>
                <td className="px-3 py-2.5"><div className="h-5 w-5 bg-slate-200 rounded-full animate-pulse" /></td>
              </tr>
            ))
          ) : sorted.length === 0 ? (
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
                  className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-y-teal"
                  tabIndex={0}
                  onClick={() => onRowClick(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowClick(p);
                    }
                  }}
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
                        aria-hidden="true"
                      />
                      <span className="text-slate-700">
                        {t(`status.${p.status.toLowerCase().replace(/ /g, "_")}`)}
                      </span>
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
                        <Avatar name={p.projectManager} size="xs" aria-hidden="true" />
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
