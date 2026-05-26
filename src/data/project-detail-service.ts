import { INSTANCE_ID } from "../bridge";
import type {
  ProjectDetail,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
  QuotationItem,
  ProjectQuotation,
  ProjectFile,
  SalesInvoice,
} from "./detail-types";

export interface ProjectDetailService {
  getProjectDetail(projectId: string): Promise<ProjectDetail>;
  getProjectTasks(projectId: string): Promise<ProjectTask[]>;
  getProjectMilestones(projectId: string): Promise<ProjectTask[]>;
  getProjectTimesheets(projectId: string): Promise<TimesheetMap>;
  getProjectActivity(projectId: string, limit?: number): Promise<ActivityItem[]>;
  getProjectFinancials(projectId: string): Promise<ProjectFinancials>;
  createDefaultPhaseTasks(projectId: string, werksoort: string): Promise<CreatePhasesResult>;
  /** Haal alle keukenblad-offertes op voor het opgegeven project (via kbf_project). */
  getProjectQuotations(projectId: string): Promise<ProjectQuotation[]>;
  /** Haal alle ingediende Sales Invoices op die aan dit project gekoppeld zijn. */
  getProjectInvoices(projectId: string): Promise<SalesInvoice[]>;
  /** Haal alle bestandsbijlagen op die aan dit project gekoppeld zijn in ERPNext. */
  getProjectFiles(projectId: string): Promise<ProjectFile[]>;
  /**
   * Sla een nieuwe rate op voor één offerteregel in ERPNext.
   * allItems = volledige huidige regellijst (nodig voor child-table PUT).
   */
  updateQuotationItemRate(
    quotationName: string,
    rowName: string,
    newRate: number,
    allItems: QuotationItem[],
  ): Promise<void>;
}

export type {
  ProjectDetail,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
  QuotationItem,
  ProjectQuotation,
  ProjectFile,
  SalesInvoice,
};

// Lazy imports om circulaire afhankelijkheid te vermijden
async function getService(): Promise<ProjectDetailService> {
  if (INSTANCE_ID) {
    const { erpnextDetailService } = await import("./project-detail-service-erpnext");
    return erpnextDetailService;
  }
  const { mockDetailService } = await import("./project-detail-service-mock");
  return mockDetailService;
}

export const projectDetailService: ProjectDetailService = {
  getProjectDetail: async (id) => (await getService()).getProjectDetail(id),
  getProjectTasks: async (id) => (await getService()).getProjectTasks(id),
  getProjectMilestones: async (id) => (await getService()).getProjectMilestones(id),
  getProjectTimesheets: async (id) => (await getService()).getProjectTimesheets(id),
  getProjectActivity: async (id, limit) => (await getService()).getProjectActivity(id, limit),
  getProjectFinancials: async (id) => (await getService()).getProjectFinancials(id),
  createDefaultPhaseTasks: async (id, werksoort) => (await getService()).createDefaultPhaseTasks(id, werksoort),
  getProjectQuotations: async (projectId) =>
    (await getService()).getProjectQuotations(projectId),
  getProjectInvoices: async (projectId) =>
    (await getService()).getProjectInvoices(projectId),
  getProjectFiles: async (projectId) =>
    (await getService()).getProjectFiles(projectId),
  updateQuotationItemRate: async (quotationName, rowName, newRate, allItems) =>
    (await getService()).updateQuotationItemRate(quotationName, rowName, newRate, allItems),
};
