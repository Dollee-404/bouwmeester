import { fetchList, updateDocument, callMethod, createDocument } from "../bridge";
import type { Project, BouwmeesterStatus, Werksoort, ListOptions } from "./types";
import type { ProjectsService, CreateProjectParams } from "./projects-service";

const FIELDS = [
  "name",
  "project_name",
  "customer",
  "status",
  "custom_bouwmeester_status",
  "project_type",       // primaire werksoort-bron (5C+)
  "custom_werksoort",   // DEPRECATED (5C) — fallback als project_type leeg is
  "expected_start_date",
  "expected_end_date",
  "percent_complete",
  "total_sales_amount",
  "total_billed_amount",
  "estimated_costing",
  "custom_budget_hours",
  "custom_weersafhankelijk",
  // custom_project_manager: legacy veld, wordt leeggemaakt in 3F-vervolg nadat alle
  // Customer Addresses zijn gevuld. Directe query op "Project User" child-doctype via
  // fetchList werkt niet betrouwbaar (Frappe-permissies op child-doctype, URL-encoding
  // van spatie). custom_project_manager is de betrouwbare databron totdat het ERPNext-veld
  // wordt leeggemaakt. De Project-type exposeert het als projectLeader — intern detail.
  "custom_project_manager",
];

interface RawProject {
  name: string;
  project_name: string;
  customer: string | null;
  status: string;
  custom_bouwmeester_status: string | null;
  project_type: string | null;
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
}

const VALID_STATUSES = new Set<BouwmeesterStatus>([
  "Lead", "Calculatie", "Gegund", "In uitvoering", "Oplevering", "Afgerond",
]);

const VALID_WERKSOORTEN = new Set<Werksoort>([
  "Renovatie", "Nieuwbouw", "Sloop", "Verbouw", "Onderhoud", "Sanering", "Keukenbladen",
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

  // project_type is primair (5C+); custom_werksoort is fallback voor projecten
  // die nog niet gemigreerd zijn.
  const werksoortRaw = raw.project_type || raw.custom_werksoort;
  const werksoort = VALID_WERKSOORTEN.has(werksoortRaw as Werksoort)
    ? (werksoortRaw as Werksoort)
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
    projectLeader: raw.custom_project_manager ?? null,
    isWeatherDependent: Boolean(raw.custom_weersafhankelijk),
    isArchived: raw.status === "Completed" || raw.status === "Cancelled"
      || raw.custom_bouwmeester_status === "Afgerond"
      || raw.custom_bouwmeester_status === "Verloren"
      || raw.custom_bouwmeester_status === "Geannuleerd",
  };
}


async function assertHolidayListConfigured(): Promise<void> {
  try {
    const defaults = await callMethod<{ default_company?: string | null }>(
      "frappe.client.get_value",
      { doctype: "Global Defaults", fieldname: "default_company" },
    );
    const company = defaults?.default_company;
    if (!company) return;

    const companyDoc = await callMethod<{ default_holiday_list?: string | null }>(
      "frappe.client.get_value",
      { doctype: "Company", filters: { name: company }, fieldname: "default_holiday_list" },
    );
    if (!companyDoc?.default_holiday_list) {
      throw new Error("HOLIDAY_LIST_MISSING");
    }
  } catch (e) {
    if (e instanceof Error && e.message === "HOLIDAY_LIST_MISSING") throw e;
    // Check failed for other reasons (permissions etc.) — proceed and let Frappe validate
  }
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
      filters.push(["project_type", "=", options.werksoort]);
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

  async createProject({ projectName, werksoort, customer, startDate }: CreateProjectParams): Promise<string> {
    await assertHolidayListConfigured();

    const doc: Record<string, unknown> = {
      project_name: projectName,
      project_type: werksoort,
      custom_bouwmeester_status: "Lead",
    };
    // "Anders" heeft geen Project Template; voor alle andere werksoorten matcht de template-naam 1:1
    if (werksoort !== "Anders") {
      doc.project_template = werksoort;
    }
    if (customer) doc.customer = customer;
    if (startDate) doc.expected_start_date = startDate;

    const result = await createDocument<{ name: string }>("Project", doc);
    cache.clear();
    return result.name;
  },
};
