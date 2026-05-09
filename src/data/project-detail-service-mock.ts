import type {
  ProjectDetail,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
} from "./detail-types";
import type { BouwmeesterStatus } from "./types";
import type { ProjectDetailService } from "./project-detail-service";
import { getPhaseTemplate } from "./default-phase-templates";

// URL-param overrides for local development (mock only):
// ?mockSlow             — vertraagt getProjectDetail naar 2500ms (skeleton testen)
// ?mockError            — laat getProjectDetail falen (error-state testen)
// ?mockStatus=Verloren  — overschrijft status (banner testen)
// ?mockOverbudget       — simuleert kostenoverschrijding (budget danger-state)
// ?mockDelayed          — verplaatst einddatum naar 30 dagen geleden (planning danger-state)
// ?mockEmptyPhases      — retourneert lege task-lijst (lege fases-staat testen)
const _p = new URLSearchParams(window.location.search);
const MOCK_DELAY_MS = _p.has("mockSlow") ? 2500 : 200;
const MOCK_FAIL = _p.has("mockError");
const MOCK_STATUS_OVERRIDE = (_p.get("mockStatus") as BouwmeesterStatus | null) ?? null;
const MOCK_OVERBUDGET = _p.has("mockOverbudget");
const MOCK_DELAYED = _p.has("mockDelayed");
const MOCK_EMPTY_PHASES      = _p.has("mockEmptyPhases");
const MOCK_EMPTY_TEAM        = _p.has("mockEmptyTeam");
const MOCK_NO_ADDRESS        = _p.has("mockNoAddress");
const MOCK_NO_MEERWERK       = _p.has("mockNoMeerwerk");
const MOCK_NEGATIVE_BALANCE  = _p.has("mockNegativeBalance");

// In-memory: onthoudt welke projecten fases hebben gekregen via de knop
const mockCreatedTasks: Record<string, ProjectTask[]> = {};

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
    const base = MOCK_DETAILS[projectId] ?? fallbackDetail(projectId);
    let result = MOCK_STATUS_OVERRIDE ? { ...base, status: MOCK_STATUS_OVERRIDE } : base;
    if (MOCK_OVERBUDGET) {
      const budget = result.budgetSales || 1_000_000;
      result = { ...result, budgetSales: budget, estimatedCosting: Math.round(budget * 1.25) };
    }
    if (MOCK_DELAYED) {
      result = { ...result, endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }
    if (MOCK_EMPTY_TEAM)  result = { ...result, team: [] };
    if (MOCK_NO_ADDRESS)  result = { ...result, customerAddress: null };
    return result;
  },

  async getProjectTasks(projectId: string): Promise<ProjectTask[]> {
    await new Promise((r) => setTimeout(r, 100));
    if (mockCreatedTasks[projectId]) return mockCreatedTasks[projectId];
    if (MOCK_EMPTY_PHASES || projectId !== "PROJ-0009") return [];
    return [
      { id: "TASK-001", subject: "Sloop",       parentTask: null, isMilestone: false, status: "Completed", progress: 100, expectedEndDate: new Date("2026-03-01"), budgetHours: 200 },
      { id: "TASK-002", subject: "Ruwbouw",     parentTask: null, isMilestone: false, status: "Open",      progress: 65,  expectedEndDate: new Date("2026-05-01"), budgetHours: 900 },
      { id: "TASK-003", subject: "Afbouw",      parentTask: null, isMilestone: false, status: "Open",      progress: 10,  expectedEndDate: new Date("2026-07-01"), budgetHours: 450 },
      { id: "TASK-004", subject: "Installatie", parentTask: null, isMilestone: false, status: "Open",      progress: 0,   expectedEndDate: null,                  budgetHours: null },
      { id: "TASK-005", subject: "Oplevering",  parentTask: null, isMilestone: false, status: "Open",      progress: 0,   expectedEndDate: null,                  budgetHours: null },
    ];
  },

  async getProjectTimesheets(projectId: string): Promise<TimesheetMap> {
    await new Promise((r) => setTimeout(r, 100));
    if (projectId !== "PROJ-0009") return {};
    return { "TASK-001": 240, "TASK-002": 580, "TASK-003": 80 };
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
    let fin = { aanneemsom: 1_150_000, meerwerk: 45_000, gefactureerd: 437_000, openstaand: 758_000 };
    if (MOCK_NO_MEERWERK)      fin = { ...fin, meerwerk: 0, openstaand: fin.aanneemsom - fin.gefactureerd };
    if (MOCK_NEGATIVE_BALANCE) fin = { ...fin, gefactureerd: 1_250_000, openstaand: fin.aanneemsom + fin.meerwerk - 1_250_000 };
    return fin;
  },

  async createDefaultPhaseTasks(projectId: string, werksoort: string): Promise<CreatePhasesResult> {
    await new Promise((r) => setTimeout(r, 300));
    const template = getPhaseTemplate(werksoort);
    if (!template) return { created: [], skipped: [], failed: [] };
    mockCreatedTasks[projectId] = template.phases.map((phase, i) => ({
      id: `MOCK-${projectId}-${i}`,
      subject: phase,
      parentTask: null,
      isMilestone: false,
      status: "Open",
      progress: 0,
      expectedEndDate: null,
      budgetHours: null,
    }));
    return { created: [...template.phases], skipped: [], failed: [] };
  },
};
