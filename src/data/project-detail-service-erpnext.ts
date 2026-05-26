import { fetchDocument, fetchList, callMethod, createDocument, updateDocument } from "../bridge";
import { getPhaseTemplate } from "./default-phase-templates";
import { parseDependsOn, parseAssign, enrichTasksWithWachtOp } from "./planning-helpers";
import type { BouwmeesterStatus, Werksoort } from "./types";
import type {
  ProjectDetail,
  ProjectTeamMember,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
  QuotationItem,
  ProjectQuotation,
  ProjectFile,
  SalesInvoice,
  InvoiceStatus,
} from "./detail-types";
import type { ProjectDetailService } from "./project-detail-service";

const VALID_STATUSES = new Set<BouwmeesterStatus>([
  "Lead", "Calculatie", "Gegund", "In uitvoering", "Oplevering", "Afgerond",
]);
const VALID_WERKSOORTEN = new Set<Werksoort>([
  "Renovatie", "Nieuwbouw", "Sloop", "Verbouw", "Onderhoud", "Sanering", "Keukenbladen", "Anders",
]);

interface RawDetailProject {
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
  is_group: 0 | 1;
  exp_start_date: string | null;
  exp_end_date: string | null;
  act_start_date?: string | null;
  act_end_date?: string | null;
  progress: number;
  expected_time?: number;
  description?: string | null;
  depends_on_tasks: string | null;
  _assign: string | null;
  custom_wacht_op?: string | null;
  custom_wacht_op_toelichting?: string | null;
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

interface RawSalesInvoiceFull {
  name: string;
  posting_date: string;
  due_date: string | null;
  grand_total: number;
  outstanding_amount: number;
  status: string;
}

interface RawComment {
  name: string;
  comment_type: string;
  content: string;
  owner: string;
  creation: string;
}

interface RawQuotationItem {
  name: string;           // child-row docname — nodig voor idempotente PUT
  item_code: string;
  item_name: string;
  description: string | null;   // Text Editor → kan HTML bevatten
  qty: number;
  uom: string;
  rate: number;
  amount: number;
}

interface RawQuotation {
  name: string;
  party_name: string;
  transaction_date: string;
  kbf_meetdatum: string | null;
  kbf_inmeter: string | null;
  kbf_tekening_pdf: string | null;
  items: RawQuotationItem[];
}

interface RawFile {
  name: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  creation: string;
  is_private: 0 | 1;
}

/** Strip HTML-tags uit Text Editor-beschrijvingen voor plain-text weergave. */
function stripHtml(html: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
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
    // Fallback naar fetchList (geen child tables, leeg team) als Frappe Project User
    // blokkeert op permissies — bekende Frappe-beperking op child-doctypes.
    let raw: RawDetailProject & { users?: RawProjectUser[] };
    try {
      raw = await fetchDocument<RawDetailProject & { users: RawProjectUser[] }>(
        "Project",
        projectId,
      );
    } catch {
      const rows = await fetchList<RawDetailProject>("Project", {
        fields: [
          "name", "project_name", "customer", "status", "custom_bouwmeester_status",
          "project_type", "custom_werksoort", "expected_start_date", "expected_end_date",
          "percent_complete", "total_sales_amount", "total_billed_amount",
          "estimated_costing", "custom_budget_hours", "custom_weersafhankelijk", "custom_address",
        ],
        filters: [["name", "=", projectId]],
        limit_page_length: 1,
      });
      if (!rows.length) throw new Error(`Project niet gevonden: ${projectId}`);
      raw = { ...rows[0], users: [] };
    }

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
      // project_type is primair (5C+); custom_werksoort is fallback voor niet-gemigreerde projecten
      werksoort: parseWerksoort(raw.project_type || raw.custom_werksoort),
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
    const baseFields = [
      "name", "subject", "parent_task", "status", "is_milestone", "is_group",
      "exp_start_date", "exp_end_date", "act_start_date", "act_end_date",
      "progress", "expected_time", "description",
      "depends_on_tasks", "_assign",
    ];

    let rows: RawTask[];
    try {
      // Probeer inclusief custom wacht-op velden (alleen beschikbaar na wizard-installatie)
      rows = await fetchList<RawTask>("Task", {
        filters: [["project", "=", projectId]],
        fields: [...baseFields, "custom_wacht_op", "custom_wacht_op_toelichting"],
        limit_page_length: 200,
      });
    } catch {
      // Graceful fallback: custom_wacht_op nog niet geïnstalleerd
      rows = await fetchList<RawTask>("Task", {
        filters: [["project", "=", projectId]],
        fields: baseFields,
        limit_page_length: 200,
      });
    }

    return enrichTasksWithWachtOp(rows.map((t) => ({
      id: t.name,
      subject: t.subject,
      parentTask: t.parent_task || null,
      isMilestone: Boolean(t.is_milestone),
      isGroup: Boolean(t.is_group),
      status: t.status,
      progress: t.progress ?? 0,
      expectedStartDate: parseDate(t.exp_start_date),
      expectedEndDate: parseDate(t.exp_end_date),
      actualStartDate: parseDate(t.act_start_date ?? null),
      actualEndDate: parseDate(t.act_end_date ?? null),
      budgetHours: t.expected_time ?? null,
      description: t.description?.trim() || null,
      dependsOn: parseDependsOn(t.depends_on_tasks),
      assignedTo: parseAssign(t._assign),
      wachtOp: t.custom_wacht_op ?? null,
      wachtOpToelichting: t.custom_wacht_op_toelichting ?? null,
    })));
  },

  async getProjectMilestones(projectId: string): Promise<ProjectTask[]> {
    const baseFields = [
      "name", "subject", "parent_task", "status", "is_milestone", "is_group",
      "exp_start_date", "exp_end_date", "act_start_date", "act_end_date",
      "progress", "expected_time", "description",
      "depends_on_tasks", "_assign",
    ];

    let rows: RawTask[];
    try {
      rows = await fetchList<RawTask>("Task", {
        filters: [["project", "=", projectId], ["is_milestone", "=", 1]],
        fields: [...baseFields, "custom_wacht_op", "custom_wacht_op_toelichting"],
        order_by: "exp_end_date asc",
        limit_page_length: 100,
      });
    } catch {
      rows = await fetchList<RawTask>("Task", {
        filters: [["project", "=", projectId], ["is_milestone", "=", 1]],
        fields: baseFields,
        order_by: "exp_end_date asc",
        limit_page_length: 100,
      });
    }

    return enrichTasksWithWachtOp(rows.map((t) => ({
      id: t.name,
      subject: t.subject,
      parentTask: t.parent_task || null,
      isMilestone: true,
      isGroup: Boolean(t.is_group),
      status: t.status,
      progress: t.progress ?? 0,
      expectedStartDate: parseDate(t.exp_start_date),
      expectedEndDate: parseDate(t.exp_end_date),
      actualStartDate: parseDate(t.act_start_date ?? null),
      actualEndDate: parseDate(t.act_end_date ?? null),
      budgetHours: t.expected_time ?? null,
      description: t.description?.trim() || null,
      dependsOn: parseDependsOn(t.depends_on_tasks),
      assignedTo: parseAssign(t._assign),
      wachtOp: t.custom_wacht_op ?? null,
      wachtOpToelichting: t.custom_wacht_op_toelichting ?? null,
    })));
  },

  async getProjectTimesheets(projectId: string): Promise<TimesheetMap> {
    try {
      const rows = await fetchList<RawTimesheetDetail>("Timesheet Detail", {
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
    } catch {
      // Timesheet Detail is een child-doctype; sommige Y-App instanties blokkeren deze query.
      return {};
    }
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

  async getProjectQuotations(projectId: string): Promise<ProjectQuotation[]> {
    const list = await fetchList<{ name: string }>("Quotation", {
      filters: [
        ["kbf_project", "=", projectId],
        ["docstatus", "!=", 2],
      ],
      fields: ["name"],
      order_by: "transaction_date desc",
      limit_page_length: 50,
    });

    if (list.length === 0) return [];

    const docs = await Promise.all(
      list.map((q) => fetchDocument<RawQuotation>("Quotation", q.name)),
    );

    return docs.map((doc): ProjectQuotation => ({
      name: doc.name,
      customerName: doc.party_name,
      transactionDate: new Date(doc.transaction_date),
      meetdatum: doc.kbf_meetdatum ? new Date(doc.kbf_meetdatum) : null,
      inmeter: doc.kbf_inmeter ?? null,
      tekenPdf: doc.kbf_tekening_pdf ?? null,
      items: (doc.items ?? []).map((row): QuotationItem => ({
        rowName: row.name,
        itemCode: row.item_code,
        itemName: row.item_name,
        description: stripHtml(row.description),
        qty: row.qty,
        uom: row.uom,
        rate: row.rate,
        amount: row.amount,
      })),
    }));
  },

  async getProjectInvoices(projectId: string): Promise<SalesInvoice[]> {
    const VALID: Set<InvoiceStatus> = new Set([
      "Paid", "Overdue", "Unpaid", "Partly Paid", "Return",
    ]);

    const invoices = await fetchList<RawSalesInvoiceFull>("Sales Invoice", {
      filters: [
        ["project", "=", projectId],
        ["docstatus", "=", 1],
      ],
      fields: ["name", "posting_date", "due_date", "grand_total", "outstanding_amount", "status"],
      order_by: "posting_date desc",
      limit_page_length: 100,
    });

    return invoices.map((inv): SalesInvoice => ({
      name: inv.name,
      postingDate: new Date(inv.posting_date),
      dueDate: inv.due_date ? new Date(inv.due_date) : null,
      grandTotal: inv.grand_total,
      outstandingAmount: inv.outstanding_amount,
      status: VALID.has(inv.status as InvoiceStatus)
        ? (inv.status as InvoiceStatus)
        : "Unpaid",
    }));
  },

  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    const files = await fetchList<RawFile>("File", {
      filters: [
        ["attached_to_doctype", "=", "Project"],
        ["attached_to_name", "=", projectId],
      ],
      fields: ["name", "file_name", "file_url", "file_size", "creation", "is_private"],
      order_by: "creation desc",
      limit_page_length: 100,
    });

    return files.map((f): ProjectFile => ({
      name: f.name,
      fileName: f.file_name,
      fileUrl: f.file_url,
      fileSize: f.file_size,
      createdAt: new Date(f.creation),
      isPrivate: f.is_private === 1,
    }));
  },

  async updateQuotationItemRate(
    quotationName: string,
    rowName: string,
    newRate: number,
    allItems: QuotationItem[],
  ): Promise<void> {
    const updatedItems = allItems.map((item) => ({
      name: item.rowName,
      rate: item.rowName === rowName ? newRate : item.rate,
    }));
    await updateDocument("Quotation", quotationName, { items: updatedItems });
  },
};
