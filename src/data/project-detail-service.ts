import { INSTANCE_ID } from "../bridge";
import type {
  ProjectDetail,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
} from "./detail-types";

export interface ProjectDetailService {
  getProjectDetail(projectId: string): Promise<ProjectDetail>;
  getProjectTasks(projectId: string): Promise<ProjectTask[]>;
  getProjectTimesheets(projectId: string): Promise<TimesheetMap>;
  getProjectActivity(projectId: string, limit?: number): Promise<ActivityItem[]>;
  getProjectFinancials(projectId: string): Promise<ProjectFinancials>;
  createDefaultPhaseTasks(projectId: string, werksoort: string): Promise<CreatePhasesResult>;
}

export type {
  ProjectDetail,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
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
  getProjectTimesheets: async (id) => (await getService()).getProjectTimesheets(id),
  getProjectActivity: async (id, limit) => (await getService()).getProjectActivity(id, limit),
  getProjectFinancials: async (id) => (await getService()).getProjectFinancials(id),
  createDefaultPhaseTasks: async (id, werksoort) => (await getService()).createDefaultPhaseTasks(id, werksoort),
};
