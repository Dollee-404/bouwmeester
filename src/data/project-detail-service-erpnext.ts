import { fetchDocument, fetchList, callMethod, createDocument } from "../bridge";
import { getPhaseTemplate } from "./default-phase-templates";
import type { BouwmeesterStatus, Werksoort } from "./types";
import type {
  ProjectDetail,
  ProjectTeamMember,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
} from "./detail-types";
import type { ProjectDetailService } from "./project-detail-service";

const VALID_STATUSES = new Set<BouwmeesterStatus>([
  "Lead", "Calculatie", "Gegund", "In uitvoering", "Oplevering", "Afgerond",
]);
const VALID_WERKSOORTEN = new Set<Werksoort>([
  "Renovatie", "Nieuwbouw", "Sloop", "Verbouw", "Onderhoud",
]);

interface RawDetailProject {
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
  custom_address: string | null;
}

interface RawProjectUser {
  user: string;
  full_name: string;
  email: string;
  custom_role: string | null;
}

interface RawTask {
  name: string;
  subject: string;
  parent_task: string | null;
  status: string;
  is_milestone: 0 | 1;
  exp_end_date: string | null;
  progress: number;
}

interface RawTimesheetDetail {
  task: string | null;
  hours: number;
}

interface RawSalesOrder {
  grand_total: number;
  custom_is_meerwerk: 0 | 1;
}

interface RawSalesInvoice {
  grand_total: number;
}

interface RawComment {
  name: string;
  comment_type: string;
  content: string;
  owner: string;
  creation: string;
}

// fetchDocument geeft het volledige document terug inclusief child tables.
// fetchList("Project User") geeft alleen `name` — Frappe-beperking op child doctypes.

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseStatus(raw: string | null): BouwmeesterStatus {
  return VALID_STATUSES.has(raw as BouwmeesterStatus)
    ? (raw as BouwmeesterStatus)
    : "Lead";
}

function parseWerksoort(raw: string | null): Werksoort | null {
  return VALID_WERKSOORTEN.has(raw as Werksoort)
    ? (raw as Werksoort)
    : null;
}

async function fetchCustomerAddress(customer: string): Promise<string | null> {
  try {
    const result = await callMethod<{ primary_address: string | null }>(
      "frappe.client.get_value",
      {
        doctype: "Customer",
        filters: { name: customer },
        fieldname: ["primary_address"],
      },
    );
    if (!result?.primary_address) return null;
    // primary_address is een Text Editor met HTML — opschonen
    return result.primary_address
      .replace(/<br\s*\/?>/gi, ", ")
      .replace(/<[^>]*>/g, "")
      .replace(/\s*,\s*/g, ", ")
      .replace(/,\s*$/, "")
      .trim() || null;
  } catch {
    return null;
  }
}

export const erpnextDetailService: ProjectDetailService = {
  async getProjectDetail(projectId: string): Promise<ProjectDetail> {
    // fetchDocument geeft het volledige Project incl. users child table mét custom_role.
    // fetchList("Project User") geeft alleen name terug — Frappe-beperking.
    const raw = await fetchDocument<RawDetailProject & { users: RawProjectUser[] }>(
      "Project",
      projectId,
    );

    const customerAddress = raw.customer
      ? await fetchCustomerAddress(raw.customer)
      : null;

    const team: ProjectTeamMember[] = (raw.users ?? []).map((u) => ({
      user: u.user,
      fullName: u.full_name,
      email: u.email,
      role: u.custom_role ?? null,
    }));

    const status = parseStatus(raw.custom_bouwmeester_status);

    return {
      id: raw.name,
      projectName: raw.project_name,
      customerName: raw.customer ?? "",
      customerAddress: customerAddress ?? raw.custom_address ?? null,
      status,
      werksoort: parseWerksoort(raw.custom_werksoort),
      startDate: parseDate(raw.expected_start_date),
      endDate: parseDate(raw.expected_end_date),
      percentComplete: raw.percent_complete ?? 0,
      budgetSales: raw.total_sales_amount ?? 0,
      budgetHours: raw.custom_budget_hours ?? null,
      billedAmount: raw.total_billed_amount ?? 0,
      estimatedCosting: raw.estimated_costing ?? 0,
      isWeatherDependent: Boolean(raw.custom_weersafhankelijk),
      isArchived:
        raw.status === "Completed" || raw.status === "Cancelled" ||
        status === "Afgerond" || status === "Verloren" || status === "Geannuleerd",
      team,
    };
  },

  async getProjectTasks(projectId: string): Promise<ProjectTask[]> {
    const rows = await fetchList<RawTask>("Task", {
      filters: [["project", "=", projectId]],
      fields: ["name", "subject", "parent_task", "status", "is_milestone", "exp_end_date", "progress"],
      limit_page_length: 200,
    });
    return rows.map((t) => ({
      id: t.name,
      subject: t.subject,
      parentTask: t.parent_task || null,
      isMilestone: Boolean(t.is_milestone),
      status: t.status,
      progress: t.progress ?? 0,
      expectedEndDate: parseDate(t.exp_end_date),
    }));
  },

  async getProjectTimesheets(projectId: string): Promise<TimesheetMap> {
    // Timesheet Detail is niet querybaar via fetchList (child doctype) — callMethod omzeilt dit
    const rows = await callMethod<RawTimesheetDetail[]>("frappe.client.get_list", {
      doctype: "Timesheet Detail",
      filters: [["project", "=", projectId]],
      fields: ["task", "hours"],
      limit_page_length: 500,
    });
    const map: TimesheetMap = {};
    for (const row of rows ?? []) {
      if (!row.task) continue;
      map[row.task] = (map[row.task] ?? 0) + row.hours;
    }
    return map;
  },

  async getProjectActivity(projectId: string, limit = 20): Promise<ActivityItem[]> {
    // Activity Log bevat alleen login-events (geen document-koppeling).
    // Frappe slaat document-activiteit op als Comments (comment_type != "Comment" voor systeem-events).
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().slice(0, 10);

    const rows = await fetchList<RawComment>("Comment", {
      filters: [
        ["reference_doctype", "=", "Project"],
        ["reference_name", "=", projectId],
        ["creation", ">=", sinceStr],
      ],
      fields: ["name", "comment_type", "content", "owner", "creation"],
      order_by: "creation desc",
      limit_page_length: limit,
    });

    return rows.map((c) => ({
      id: c.name,
      type: c.comment_type === "Comment" ? "comment" : "log",
      description: (c.content ?? "").replace(/<[^>]*>/g, "").trim(),
      owner: c.owner,
      createdAt: new Date(c.creation),
    }));
  },

  async getProjectFinancials(projectId: string): Promise<ProjectFinancials> {
    const [orders, invoices] = await Promise.all([
      fetchList<RawSalesOrder>("Sales Order", {
        filters: [["project", "=", projectId], ["docstatus", "=", 1]],
        fields: ["grand_total", "custom_is_meerwerk"],
        limit_page_length: 200,
      }),
      fetchList<RawSalesInvoice>("Sales Invoice", {
        filters: [["project", "=", projectId], ["docstatus", "=", 1]],
        fields: ["grand_total"],
        limit_page_length: 200,
      }),
    ]);

    const aanneemsom = orders
      .filter((o) => !o.custom_is_meerwerk)
      .reduce((s, o) => s + o.grand_total, 0);
    const meerwerk = orders
      .filter((o) => Boolean(o.custom_is_meerwerk))
      .reduce((s, o) => s + o.grand_total, 0);
    const gefactureerd = invoices.reduce((s, i) => s + i.grand_total, 0);

    return {
      aanneemsom,
      meerwerk,
      gefactureerd,
      openstaand: aanneemsom + meerwerk - gefactureerd,
    };
  },

  async createDefaultPhaseTasks(projectId: string, werksoort: string): Promise<CreatePhasesResult> {
    if (!projectId) throw new Error("projectId is verplicht");
    if (!werksoort) throw new Error("werksoort is verplicht");

    const template = getPhaseTemplate(werksoort);
    if (!template) {
      throw new Error(
        `Geen standaard fases gedefinieerd voor werksoort '${werksoort}'. Voeg ze toe in default-phase-templates.ts.`,
      );
    }

    // Valideer dat project bestaat
    const proj = await fetchList<{ name: string }>("Project", {
      filters: [["name", "=", projectId]],
      fields: ["name"],
      limit_page_length: 1,
    });
    if (!proj.length) throw new Error(`Project '${projectId}' niet gevonden.`);

    // Idempotentie: check welke fase-Tasks al bestaan
    const existing = await fetchList<{ subject: string }>("Task", {
      filters: [["project", "=", projectId], ["subject", "in", template.phases]],
      fields: ["subject"],
      limit_page_length: template.phases.length + 1,
    });
    const existingSubjects = new Set(existing.map((t) => t.subject));

    const created: string[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];

    for (const phase of template.phases) {
      if (existingSubjects.has(phase)) {
        skipped.push(phase);
        continue;
      }
      try {
        await createDocument("Task", {
          subject: phase,
          project: projectId,
          is_group: 1,
          status: "Open",
          expected_time: 0,
        });
        created.push(phase);
      } catch {
        failed.push(phase);
      }
    }

    return { created, skipped, failed };
  },
};
