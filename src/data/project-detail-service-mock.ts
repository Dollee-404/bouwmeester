import type {
  ProjectDetail,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
} from "./detail-types";
import type { ProjectDetailService } from "./project-detail-service";
import { getPhaseTemplate } from "./default-phase-templates";

// URL-param overrides for local development (mock only):
// ?mockSlow  — vertraagt getProjectDetail naar 2500ms (skeleton testen)
// ?mockError — laat getProjectDetail falen (error-state testen)
const _p = new URLSearchParams(window.location.search);
const MOCK_DELAY_MS = _p.has("mockSlow") ? 2500 : 200;
const MOCK_FAIL = _p.has("mockError");

const MOCK_DETAILS: Record<string, ProjectDetail> = {
  "PROJ-0009": {
    id: "PROJ-0009",
    projectName: "Renovatie Gemeentehuis Sliedrecht",
    customerName: "Gemeente Sliedrecht",
    customerAddress: "Koninginnestraat 1, 3361 AJ Sliedrecht",
    status: "In uitvoering",
    werksoort: "Renovatie",
    startDate: new Date("2026-02-01"),
    endDate: new Date("2026-08-31"),
    percentComplete: 38,
    budgetSales: 1_150_000,
    budgetHours: 2300,
    billedAmount: 437_000,
    estimatedCosting: 1_020_000,
    isWeatherDependent: false,
    isArchived: false,
    team: [
      { user: "m.janssen@example.nl", fullName: "M. Janssen", email: "m.janssen@example.nl", role: "projectleider" },
      { user: "r.dekker@example.nl", fullName: "R. Dekker", email: "r.dekker@example.nl", role: "uitvoerder" },
      { user: "s.post@example.nl", fullName: "S. Post", email: "s.post@example.nl", role: "werkvoorbereider" },
    ],
  },
};

function fallbackDetail(projectId: string): ProjectDetail {
  return {
    id: projectId,
    projectName: `Project ${projectId}`,
    customerName: "Testklant BV",
    customerAddress: null,
    status: "Lead",
    werksoort: null,
    startDate: null,
    endDate: null,
    percentComplete: 0,
    budgetSales: 0,
    budgetHours: null,
    billedAmount: 0,
    estimatedCosting: 0,
    isWeatherDependent: false,
    isArchived: false,
    team: [],
  };
}

export const mockDetailService: ProjectDetailService = {
  async getProjectDetail(projectId: string): Promise<ProjectDetail> {
    await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
    if (MOCK_FAIL) throw new Error("Gesimuleerde fout (mockError in URL)");
    return MOCK_DETAILS[projectId] ?? fallbackDetail(projectId);
  },

  async getProjectTasks(_projectId: string): Promise<ProjectTask[]> {
    await new Promise((r) => setTimeout(r, 100));
    return [];
  },

  async getProjectTimesheets(_projectId: string): Promise<TimesheetMap> {
    await new Promise((r) => setTimeout(r, 100));
    return {};
  },

  async getProjectActivity(projectId: string, limit = 20): Promise<ActivityItem[]> {
    await new Promise((r) => setTimeout(r, 100));
    const items: ActivityItem[] = projectId === "PROJ-0009" ? [
      {
        id: "cmt-001",
        type: "comment",
        description: "Sloopwerkzaamheden starten maandag. Omwonenden zijn geïnformeerd.",
        owner: "m.janssen@example.nl",
        createdAt: new Date("2026-04-28T09:15:00"),
      },
      {
        id: "cmt-002",
        type: "log",
        description: "Status gewijzigd naar In uitvoering",
        owner: "m.janssen@example.nl",
        createdAt: new Date("2026-04-21T14:30:00"),
      },
      {
        id: "cmt-003",
        type: "log",
        description: "Meerwerkopdracht aangemaakt: SAL-ORD-2026-00045",
        owner: "s.post@example.nl",
        createdAt: new Date("2026-04-15T11:00:00"),
      },
      {
        id: "cmt-004",
        type: "comment",
        description: "Materiaallevering ruwbouw uitgesteld naar week 22.",
        owner: "r.dekker@example.nl",
        createdAt: new Date("2026-04-10T16:45:00"),
      },
      {
        id: "cmt-005",
        type: "log",
        description: "Project aangemaakt",
        owner: "Administrator",
        createdAt: new Date("2026-02-01T08:00:00"),
      },
    ] : [];
    return items.slice(0, limit);
  },

  async getProjectFinancials(_projectId: string): Promise<ProjectFinancials> {
    await new Promise((r) => setTimeout(r, 100));
    return { aanneemsom: 1_150_000, meerwerk: 45_000, gefactureerd: 437_000, openstaand: 758_000 };
  },

  async createDefaultPhaseTasks(_projectId: string, werksoort: string): Promise<CreatePhasesResult> {
    await new Promise((r) => setTimeout(r, 300));
    const template = getPhaseTemplate(werksoort);
    if (!template) return { created: [], skipped: [], failed: [] };
    return { created: [...template.phases], skipped: [], failed: [] };
  },
};
