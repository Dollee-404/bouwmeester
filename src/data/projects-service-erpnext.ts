import { fetchList, updateDocument } from "../bridge";
import type { Project, BouwmeesterStatus, Werksoort, ListOptions } from "./types";
import type { ProjectsService } from "./projects-service";

const FIELDS = [
  "name",
  "project_name",
  "customer",
  "status",
  "custom_bouwmeester_status",
  "custom_werksoort",
  "expected_start_date",
  "expected_end_date",
  "percent_complete",
  "total_sales_amount",
  "total_billed_amount",
  "estimated_costing",
  "custom_budget_hours",
  "custom_weersafhankelijk",
  "custom_project_manager",
  "custom_address",
];

interface RawProject {
  name: string;
  project_name: string;
  customer: string | null;
  status: string;
  custom_bouwmeester_status: string | null;
  custom_werksoort: string | null;
  expected_start_date: string | null;
  expected_end_date: string | null;
  percent_complete: number | null;
  total_sales_amount: number | null;
  total_billed_amount: number | null;
  estimated_costing: number | null;
  custom_budget_hours: number | null;
  custom_weersafhankelijk: 0 | 1 | null;
  custom_project_manager: string | null;
  custom_address: string | null;
}

const VALID_STATUSES = new Set<BouwmeesterStatus>([
  "Lead", "Calculatie", "Gegund", "In uitvoering", "Oplevering", "Afgerond",
]);

const VALID_WERKSOORTEN = new Set<Werksoort>([
  "Renovatie", "Nieuwbouw", "Sloop", "Verbouw", "Onderhoud",
]);

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function toProject(raw: RawProject): Project {
  const status = VALID_STATUSES.has(raw.custom_bouwmeester_status as BouwmeesterStatus)
    ? (raw.custom_bouwmeester_status as BouwmeesterStatus)
    : "Lead";

  const werksoort = VALID_WERKSOORTEN.has(raw.custom_werksoort as Werksoort)
    ? (raw.custom_werksoort as Werksoort)
    : null;

  return {
    id: raw.name,
    projectName: raw.project_name,
    customerName: raw.customer ?? "",
    status,
    werksoort,
    startDate: parseDate(raw.expected_start_date),
    endDate: parseDate(raw.expected_end_date),
    percentComplete: raw.percent_complete ?? 0,
    budgetSales: raw.total_sales_amount ?? 0,
    budgetHours: raw.custom_budget_hours ?? null,
    billedAmount: raw.total_billed_amount ?? 0,
    estimatedCosting: raw.estimated_costing ?? 0,
    projectManager: raw.custom_project_manager ?? null,
    address: raw.custom_address ?? null,
    isWeatherDependent: Boolean(raw.custom_weersafhankelijk),
    isArchived: raw.status === "Completed" || raw.status === "Cancelled"
      || raw.custom_bouwmeester_status === "Verloren"
      || raw.custom_bouwmeester_status === "Geannuleerd",
  };
}

interface CacheEntry {
  data: Project[];
  ts: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60_000;

function cacheKey(options: ListOptions): string {
  return JSON.stringify(options);
}

export const erpnextService: ProjectsService = {
  async list(options = {}) {
    const key = cacheKey(options);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

    const filters: unknown[][] = [];

    if (!options.includeArchived) {
      filters.push(["status", "!=", "Cancelled"]);
    }
    if (options.status) {
      filters.push(["custom_bouwmeester_status", "=", options.status]);
    }
    if (options.werksoort) {
      filters.push(["custom_werksoort", "=", options.werksoort]);
    }
    if (options.search) {
      filters.push(["project_name", "like", `%${options.search}%`]);
    }

    const raw = await fetchList<RawProject>("Project", {
      fields: FIELDS,
      filters,
      limit_page_length: 500,
      order_by: "modified desc",
    });

    const data = raw.map(toProject);
    cache.set(key, { data, ts: Date.now() });
    return data;
  },

  async getOne(id) {
    const raw = await fetchList<RawProject>("Project", {
      fields: FIELDS,
      filters: [["name", "=", id]],
      limit_page_length: 1,
    });
    if (!raw.length) throw new Error(`Project niet gevonden: ${id}`);
    return toProject(raw[0]);
  },

  async updateStatus(id, newStatus) {
    await updateDocument("Project", id, { custom_bouwmeester_status: newStatus });
    cache.clear();
  },
};
