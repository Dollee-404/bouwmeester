import type {
  ProjectDetail,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
  ProjectQuotation,
  ProjectFile,
  SalesInvoice,
} from "./detail-types";
import type { BouwmeesterStatus } from "./types";
import type { ProjectDetailService } from "./project-detail-service";
import { getPhaseTemplate } from "./default-phase-templates";
import { enrichTasksWithWachtOp } from "./planning-helpers";

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
  "PROJ-0011": {
    id: "PROJ-0011",
    projectName: "Keukenbladen Renovatie Keuken Hartman",
    customerName: "Familie Hartman",
    customerAddress: "Merwedestraat 38, 3312 CS Dordrecht",
    status: "Oplevering",
    werksoort: "Keukenbladen",
    startDate: new Date("2026-04-14"),
    endDate: new Date("2026-05-30"),
    percentComplete: 92,
    budgetSales: 3_250,
    budgetHours: 12,
    billedAmount: 3_250,
    estimatedCosting: 2_600,
    isWeatherDependent: false,
    isArchived: false,
    team: [
      { user: "j.devries@example.nl", fullName: "J. de Vries", email: "j.devries@example.nl", role: "projectleider" },
    ],
  },
  "PROJ-0023": {
    id: "PROJ-0023",
    projectName: "Keukenbladen Nieuw Woonhuis Van der Linden",
    customerName: "Familie Van der Linden",
    customerAddress: "Acacialaan 14, 3297 BK Puttershoek",
    status: "Oplevering",
    werksoort: "Keukenbladen",
    startDate: new Date("2026-04-07"),
    endDate: new Date("2026-06-03"),
    percentComplete: 88,
    budgetSales: 4_850,
    budgetHours: 18,
    billedAmount: 4_365,
    estimatedCosting: 3_900,
    isWeatherDependent: false,
    isArchived: false,
    team: [
      { user: "j.devries@example.nl", fullName: "J. de Vries", email: "j.devries@example.nl", role: "projectleider" },
    ],
  },
  "PROJ-0022": {
    id: "PROJ-0022",
    projectName: "Verbouw Appartementsgebouw Stationsplein Dordrecht",
    customerName: "Dordrecht Wonen",
    customerAddress: "Stationsplein 12–24, 3311 JV Dordrecht",
    status: "Oplevering",
    werksoort: "Verbouw",
    startDate: new Date("2025-06-01"),
    endDate: new Date("2026-06-20"),
    percentComplete: 91,
    budgetSales: 2_150_000,
    budgetHours: 4_100,
    billedAmount: 1_955_000,
    estimatedCosting: 1_940_000,
    isWeatherDependent: false,
    isArchived: false,
    team: [
      { user: "m.janssen@example.nl", fullName: "M. Janssen", email: "m.janssen@example.nl", role: "projectleider" },
      { user: "r.dekker@example.nl", fullName: "R. Dekker", email: "r.dekker@example.nl", role: "uitvoerder" },
      { user: "a.vos@example.nl", fullName: "A. Vos", email: "a.vos@example.nl", role: "werkvoorbereider" },
    ],
  },
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

const MOCK_QUOTATIONS: Record<string, ProjectQuotation[]> = {
  "PROJ-0023": [
    {
      name: "QTN-KB-2026-00041",
      customerName: "Familie Van der Linden",
      transactionDate: new Date("2026-04-08"),
      meetdatum: new Date("2026-04-07"),
      inmeter: "J. de Vries",
      tekenPdf: null,
      items: [
        { rowName: "kb-001", itemCode: "COMPOSIET-BLAD-30MM", itemName: "Composiet 30mm — Silestone Eternal Calacatta Gold", description: "Materiaal: Wit/Goud / Gepolijst / Composiet / 30mm\nAfmetingen: 3200×650mm + 1400×650mm (L-vorm)\nRandafwerking: Voor: DV40", qty: 2.99, uom: "Square Meter", rate: 895, amount: 2_676.05 },
        { rowName: "kb-002", itemCode: "TOESLAG-SPARING-ONDERBOUW", itemName: "Sparing onderbouw spoelbak", description: "Onderbouw / Blanco Steel 780×500mm", qty: 1, uom: "Nos", rate: 95, amount: 95 },
        { rowName: "kb-003", itemCode: "TOESLAG-BOORGAT-KRAAN", itemName: "Boorgat kraan", description: "Kraan (1 boorgat)", qty: 1, uom: "Nos", rate: 45, amount: 45 },
        { rowName: "kb-004", itemCode: "TOESLAG-RAND-DV40", itemName: "Randafwerking DV40", description: "Randafwerking DV40 — 4.600m", qty: 4.6, uom: "Meter", rate: 38, amount: 174.80 },
        { rowName: "kb-005", itemCode: "MONTAGE-KEUKENBLAD", itemName: "Montage keukenblad", description: "Inclusief transport, plaatsing en aansluiting spoelbak", qty: 1, uom: "Nos", rate: 485, amount: 485 },
      ],
    },
  ],
  "PROJ-0009": [
    {
      name: "QTN-DEMO-001",
      customerName: "Gemeente Sliedrecht",
      transactionDate: new Date("2026-05-10"),
      meetdatum: new Date("2026-05-08"),
      inmeter: "J. de Vries",
      tekenPdf: null,
      items: [
        {
          rowName: "row-001",
          itemCode: "COMPOSIET-BLAD-20MM",
          itemName: "Composiet 20mm — Silestone Blanco Zeus",
          description: "Materiaal: Wit / Mat / Composiet / 20mm\nAfmetingen: 2400×600mm\nRandafwerking: Voor: DV20",
          qty: 1.44,
          uom: "Square Meter",
          rate: 0,
          amount: 0,
        },
        {
          rowName: "row-002",
          itemCode: "TOESLAG-SPARING-ONDERBOUW",
          itemName: "Sparing onderbouw spoelbak",
          description: "Onderbouw / Blanco Steel 780×500mm",
          qty: 1,
          uom: "Nos",
          rate: 0,
          amount: 0,
        },
        {
          rowName: "row-003",
          itemCode: "TOESLAG-BOORGAT-KRAAN",
          itemName: "Boorgat kraan",
          description: "Kraan (1 boorgat)",
          qty: 1,
          uom: "Nos",
          rate: 0,
          amount: 0,
        },
        {
          rowName: "row-004",
          itemCode: "TOESLAG-RAND-DV20",
          itemName: "Randafwerking DV20",
          description: "Randafwerking DV20 — 2.400m",
          qty: 2.4,
          uom: "Meter",
          rate: 0,
          amount: 0,
        },
      ],
    },
  ],
};

const MOCK_INVOICES: Record<string, SalesInvoice[]> = {
  "PROJ-0011": [
    {
      name: "SINV-2026-00028",
      postingDate: new Date("2026-05-14"),
      dueDate: new Date("2026-06-13"),
      grandTotal: 3_250,
      outstandingAmount: 0,
      status: "Paid",
    },
  ],
  "PROJ-0009": [
    {
      name: "SINV-2026-00012",
      postingDate: new Date("2026-02-28"),
      dueDate: new Date("2026-03-28"),
      grandTotal: 287_500,
      outstandingAmount: 0,
      status: "Paid",
    },
    {
      name: "SINV-2026-00031",
      postingDate: new Date("2026-04-30"),
      dueDate: new Date("2026-05-30"),
      grandTotal: 149_500,
      outstandingAmount: 149_500,
      status: "Overdue",
    },
  ],
};

// In-memory opslag van gewijzigde prijzen per sessie (mock only)
const mockRates: Record<string, number> = {};

const MOCK_FILES: Record<string, ProjectFile[]> = {
  "PROJ-0009": [
    {
      name: "FILE-0001",
      fileName: "bestek-renovatie-gemeentehuis.pdf",
      fileUrl: "/files/bestek-renovatie-gemeentehuis.pdf",
      fileSize: 2_451_200,
      createdAt: new Date("2026-02-15T09:00:00"),
      isPrivate: false,
    },
    {
      name: "FILE-0002",
      fileName: "plattegrond-begane-grond.dwg",
      fileUrl: "/files/plattegrond-begane-grond.dwg",
      fileSize: 912_384,
      createdAt: new Date("2026-02-15T09:05:00"),
      isPrivate: false,
    },
    {
      name: "FILE-0003",
      fileName: "veiligheids-en-gezondheidsplan.docx",
      fileUrl: "/files/veiligheids-en-gezondheidsplan.docx",
      fileSize: 148_992,
      createdAt: new Date("2026-03-01T14:30:00"),
      isPrivate: true,
    },
  ],
};

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
    if (MOCK_EMPTY_PHASES) return [];
    if (projectId === "PROJ-0011") return enrichTasksWithWachtOp([
      { id: "T11-01", subject: "Calculatie & offerte",  parentTask: null, isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2026-04-14"), expectedEndDate: new Date("2026-04-16"), actualStartDate: new Date("2026-04-14"), actualEndDate: new Date("2026-04-15"), budgetHours: 1.5, description: "Opmeten keuken + offerte opgesteld en akkoord.", dependsOn: [],         assignedTo: ["j.devries@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T11-02", subject: "Tekening goedkeuren",   parentTask: null, isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2026-04-17"), expectedEndDate: new Date("2026-04-24"), actualStartDate: new Date("2026-04-17"), actualEndDate: new Date("2026-04-22"), budgetHours: 0.5, description: "Werkplaatstekening verstuurd, klant akkoord per mail.", dependsOn: ["T11-01"], assignedTo: ["j.devries@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T11-03", subject: "Productie bij Vasto",   parentTask: null, isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2026-04-28"), expectedEndDate: new Date("2026-05-09"), actualStartDate: new Date("2026-04-28"), actualEndDate: new Date("2026-05-09"), budgetHours: null, description: "Graniet 30mm gefreesd en gepolijst door Vasto.",    dependsOn: ["T11-02"], assignedTo: [],                       wachtOp: null, wachtOpToelichting: null },
      { id: "T11-04", subject: "Levering",              parentTask: null, isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2026-05-12"), expectedEndDate: new Date("2026-05-12"), actualStartDate: new Date("2026-05-12"), actualEndDate: new Date("2026-05-12"), budgetHours: 1.5, description: "Transport en lossing op locatie — geen beschadigingen.", dependsOn: ["T11-03"], assignedTo: ["j.devries@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T11-05", subject: "Montage",               parentTask: null, isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2026-05-13"), expectedEndDate: new Date("2026-05-13"), actualStartDate: new Date("2026-05-13"), actualEndDate: new Date("2026-05-13"), budgetHours: 7,   description: "Blad geplaatst, spoelbak aangesloten, siliconen afgewerkt.",  dependsOn: ["T11-04"], assignedTo: ["j.devries@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T11-06", subject: "Oplevering",            parentTask: null, isMilestone: true,  isGroup: false, status: "Open",      progress: 0,   expectedStartDate: new Date("2026-05-30"), expectedEndDate: new Date("2026-05-30"), actualStartDate: null,                  actualEndDate: null,                  budgetHours: 0.5, description: "Eindcontrole, foto's voor dossier, handtekening opleveringsformulier.", dependsOn: ["T11-05"], assignedTo: ["j.devries@example.nl"], wachtOp: null, wachtOpToelichting: null },
    ]);
    if (projectId === "PROJ-0023") return enrichTasksWithWachtOp([
      { id: "T23-01", subject: "Calculatie & offerte",    parentTask: null, isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2026-04-07"), expectedEndDate: new Date("2026-04-11"), actualStartDate: new Date("2026-04-07"), actualEndDate: new Date("2026-04-10"), budgetHours: 2,   description: "Opmeten keuken, offerte opstellen en accorderen.", dependsOn: [],         assignedTo: ["j.devries@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T23-02", subject: "Tekening goedkeuren",     parentTask: null, isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2026-04-14"), expectedEndDate: new Date("2026-04-25"), actualStartDate: new Date("2026-04-14"), actualEndDate: new Date("2026-04-23"), budgetHours: 1,   description: "Werkplaatstekening ter goedkeuring naar klant. Klant akkoord op 23 april.", dependsOn: ["T23-01"], assignedTo: ["j.devries@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T23-03", subject: "Productie bij Vasto",     parentTask: null, isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2026-04-28"), expectedEndDate: new Date("2026-05-16"), actualStartDate: new Date("2026-04-28"), actualEndDate: new Date("2026-05-16"), budgetHours: null, description: "Composiet keukenblad 30mm gefreesd en randafgewerkt door Vasto.",  dependsOn: ["T23-02"], assignedTo: [],                       wachtOp: null, wachtOpToelichting: null },
      { id: "T23-04", subject: "Levering",                parentTask: null, isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2026-05-19"), expectedEndDate: new Date("2026-05-19"), actualStartDate: new Date("2026-05-19"), actualEndDate: new Date("2026-05-19"), budgetHours: 2,   description: "Transport en lossing op locatie.",                                    dependsOn: ["T23-03"], assignedTo: ["j.devries@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T23-05", subject: "Montage",                 parentTask: null, isMilestone: false, isGroup: false, status: "Open",      progress: 70,  expectedStartDate: new Date("2026-05-20"), expectedEndDate: new Date("2026-05-28"), actualStartDate: new Date("2026-05-20"), actualEndDate: null,                  budgetHours: 10,  description: "Plaatsing bladen, aansluiting spoelbak en kraangat afwerken.",       dependsOn: ["T23-04"], assignedTo: ["j.devries@example.nl"], wachtOp: "Materiaal", wachtOpToelichting: "Achterwand tegels worden apart door klant aangebracht — hierna afdichting siliconen afmaken." },
      { id: "T23-06", subject: "Oplevering",              parentTask: null, isMilestone: true,  isGroup: false, status: "Open",      progress: 0,   expectedStartDate: new Date("2026-06-03"), expectedEndDate: new Date("2026-06-03"), actualStartDate: null,                  actualEndDate: null,                  budgetHours: 1,   description: "Eindcontrole, foto's voor dossier, handtekening opleveringsformulier.", dependsOn: ["T23-05"], assignedTo: ["j.devries@example.nl"], wachtOp: null, wachtOpToelichting: null },
    ]);
    if (projectId === "PROJ-0022") return enrichTasksWithWachtOp([
      { id: "T22-01",  subject: "Sloop",                      parentTask: null,      isMilestone: false, isGroup: true,  status: "Completed", progress: 100, expectedStartDate: new Date("2025-06-01"), expectedEndDate: new Date("2025-07-15"), actualStartDate: new Date("2025-06-02"), actualEndDate: new Date("2025-07-14"), budgetHours: 320,  description: "Inboedel verwijderen en sloopwerkzaamheden bestaande indeling.", dependsOn: [],            assignedTo: ["r.dekker@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T22-01A", subject: "Inboedel verwijderen",        parentTask: "T22-01",  isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2025-06-02"), expectedEndDate: new Date("2025-06-14"), actualStartDate: new Date("2025-06-02"), actualEndDate: new Date("2025-06-13"), budgetHours: 60,   description: null, dependsOn: [],         assignedTo: ["r.dekker@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T22-01B", subject: "Sloopwerkzaamheden",          parentTask: "T22-01",  isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2025-06-16"), expectedEndDate: new Date("2025-07-14"), actualStartDate: new Date("2025-06-16"), actualEndDate: new Date("2025-07-14"), budgetHours: 260,  description: null, dependsOn: ["T22-01A"], assignedTo: ["r.dekker@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T22-02",  subject: "Ruwbouw",                     parentTask: null,      isMilestone: false, isGroup: true,  status: "Completed", progress: 100, expectedStartDate: new Date("2025-07-16"), expectedEndDate: new Date("2025-10-31"), actualStartDate: new Date("2025-07-16"), actualEndDate: new Date("2025-10-29"), budgetHours: 980,  description: "Nieuwe draagconstructie, vloerplaten verdiepingen en betonwerk.", dependsOn: ["T22-01"],   assignedTo: ["r.dekker@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T22-02A", subject: "Nieuwe draagconstructie",     parentTask: "T22-02",  isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2025-07-16"), expectedEndDate: new Date("2025-09-05"), actualStartDate: new Date("2025-07-16"), actualEndDate: new Date("2025-09-04"), budgetHours: 480,  description: null, dependsOn: [],         assignedTo: ["r.dekker@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T22-02B", subject: "Vloerplaten verdiepingen",    parentTask: "T22-02",  isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2025-09-08"), expectedEndDate: new Date("2025-10-29"), actualStartDate: new Date("2025-09-08"), actualEndDate: new Date("2025-10-29"), budgetHours: 500,  description: null, dependsOn: ["T22-02A"], assignedTo: ["r.dekker@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T22-03",  subject: "Gevel & kozijnen",            parentTask: null,      isMilestone: false, isGroup: true,  status: "Completed", progress: 100, expectedStartDate: new Date("2025-09-01"), expectedEndDate: new Date("2025-12-20"), actualStartDate: new Date("2025-09-08"), actualEndDate: new Date("2025-12-19"), budgetHours: 640,  description: "Gevelisolatie, nieuwe kozijnen en gevelbekleding.", dependsOn: ["T22-02"],   assignedTo: ["r.dekker@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T22-04",  subject: "Installaties",                parentTask: null,      isMilestone: false, isGroup: true,  status: "Completed", progress: 100, expectedStartDate: new Date("2025-10-01"), expectedEndDate: new Date("2026-02-28"), actualStartDate: new Date("2025-10-06"), actualEndDate: new Date("2026-02-27"), budgetHours: 760,  description: "Elektra, CV & warmtepomp, sanitair ruwbouw door onderaannemer.", dependsOn: ["T22-02"],   assignedTo: [],                      wachtOp: null, wachtOpToelichting: null },
      { id: "T22-04A", subject: "Elektra ruwbouw",             parentTask: "T22-04",  isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2025-10-06"), expectedEndDate: new Date("2025-11-30"), actualStartDate: new Date("2025-10-06"), actualEndDate: new Date("2025-11-28"), budgetHours: 220,  description: null, dependsOn: [],         assignedTo: [],                      wachtOp: null, wachtOpToelichting: null },
      { id: "T22-04B", subject: "CV & warmtepomp",             parentTask: "T22-04",  isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2025-11-03"), expectedEndDate: new Date("2026-01-16"), actualStartDate: new Date("2025-11-03"), actualEndDate: new Date("2026-01-15"), budgetHours: 300,  description: null, dependsOn: [],         assignedTo: [],                      wachtOp: null, wachtOpToelichting: null },
      { id: "T22-04C", subject: "Sanitair ruwbouw",            parentTask: "T22-04",  isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2025-12-01"), expectedEndDate: new Date("2026-02-27"), actualStartDate: new Date("2025-12-01"), actualEndDate: new Date("2026-02-27"), budgetHours: 240,  description: null, dependsOn: [],         assignedTo: [],                      wachtOp: null, wachtOpToelichting: null },
      { id: "T22-05",  subject: "Afbouw",                      parentTask: null,      isMilestone: false, isGroup: true,  status: "Open",      progress: 80,  expectedStartDate: new Date("2026-01-15"), expectedEndDate: new Date("2026-05-31"), actualStartDate: new Date("2026-01-20"), actualEndDate: null,                  budgetHours: 1_100, description: "Stucwerk, vloerwerk en sanitair afwerking.", dependsOn: ["T22-04"],   assignedTo: ["r.dekker@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T22-05A", subject: "Stucwerk",                    parentTask: "T22-05",  isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2026-01-20"), expectedEndDate: new Date("2026-03-14"), actualStartDate: new Date("2026-01-20"), actualEndDate: new Date("2026-03-12"), budgetHours: 380,  description: null, dependsOn: [],         assignedTo: ["r.dekker@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T22-05B", subject: "Vloerwerk woonlagen",         parentTask: "T22-05",  isMilestone: false, isGroup: false, status: "Open",      progress: 60,  expectedStartDate: new Date("2026-03-17"), expectedEndDate: new Date("2026-05-15"), actualStartDate: new Date("2026-03-17"), actualEndDate: null,                  budgetHours: 420,  description: null, dependsOn: ["T22-05A"], assignedTo: ["r.dekker@example.nl"], wachtOp: "Materiaal", wachtOpToelichting: "Aanvullende vloertegels (kleur afgestemd per woning) verwacht week 23." },
      { id: "T22-05C", subject: "Sanitair afwerking",          parentTask: "T22-05",  isMilestone: false, isGroup: false, status: "Open",      progress: 0,   expectedStartDate: new Date("2026-05-18"), expectedEndDate: new Date("2026-05-31"), actualStartDate: null,                  actualEndDate: null,                  budgetHours: 300,  description: null, dependsOn: ["T22-05B"], assignedTo: [],                      wachtOp: null, wachtOpToelichting: null },
      { id: "T22-06",  subject: "Oplevering",                  parentTask: null,      isMilestone: false, isGroup: true,  status: "Open",      progress: 0,   expectedStartDate: new Date("2026-06-06"), expectedEndDate: new Date("2026-06-20"), actualStartDate: null,                  actualEndDate: null,                  budgetHours: 120,  description: "Eindschoonmaak, opleveringsinspectie en overdracht aan opdrachtgever.", dependsOn: ["T22-05"], assignedTo: ["m.janssen@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "T22-06A", subject: "Bouwlift inplannen",          parentTask: "T22-06",  isMilestone: false, isGroup: false, status: "Open",      progress: 0,   expectedStartDate: new Date("2026-06-06"), expectedEndDate: new Date("2026-06-06"), actualStartDate: null,                  actualEndDate: null,                  budgetHours: null, description: null, dependsOn: [],         assignedTo: ["m.janssen@example.nl"], wachtOp: "Anders", wachtOpToelichting: "Bouwlift reserveren via verhuurder — datum nog niet bevestigd. Minimaal 2 weken vooraf aanvragen." },
      { id: "T22-06B", subject: "Eindschoonmaak",              parentTask: "T22-06",  isMilestone: false, isGroup: false, status: "Open",      progress: 0,   expectedStartDate: new Date("2026-06-09"), expectedEndDate: new Date("2026-06-13"), actualStartDate: null,                  actualEndDate: null,                  budgetHours: 80,   description: null, dependsOn: ["T22-06A"], assignedTo: [],                      wachtOp: null, wachtOpToelichting: null },
      { id: "T22-06C", subject: "Opleveringsinspectie & punchlist", parentTask: "T22-06", isMilestone: true, isGroup: false, status: "Open", progress: 0, expectedStartDate: new Date("2026-06-20"), expectedEndDate: new Date("2026-06-20"), actualStartDate: null,                  actualEndDate: null,                  budgetHours: null, description: "Formele overdracht aan Dordrecht Wonen.", dependsOn: ["T22-05", "T22-06B"], assignedTo: ["m.janssen@example.nl"], wachtOp: null, wachtOpToelichting: null },
    ]);
    if (projectId !== "PROJ-0009") return [];
    return enrichTasksWithWachtOp([
      { id: "TASK-001", subject: "Sloop",              parentTask: null,      isMilestone: false, isGroup: true,  status: "Completed", progress: 100, expectedStartDate: new Date("2026-02-01"), expectedEndDate: new Date("2026-03-01"), actualStartDate: new Date("2026-02-03"), actualEndDate: new Date("2026-03-05"), budgetHours: 200,  description: "Sloopwerkzaamheden inclusief asbest-inventarisatie.",   dependsOn: [],            assignedTo: ["r.dekker@example.nl"],  wachtOp: null, wachtOpToelichting: null },
      { id: "TASK-002", subject: "Ruwbouw",            parentTask: null,      isMilestone: false, isGroup: true,  status: "Open",      progress: 65,  expectedStartDate: new Date("2026-03-02"), expectedEndDate: new Date("2026-05-01"), actualStartDate: new Date("2026-03-06"), actualEndDate: null,                  budgetHours: 900,  description: "Betonvloer, metselwerk en dakafdekking.",               dependsOn: ["TASK-001"],  assignedTo: ["r.dekker@example.nl"],  wachtOp: null, wachtOpToelichting: null },
      { id: "TASK-002A", subject: "Betonvloer",        parentTask: "TASK-002", isMilestone: false, isGroup: false, status: "Completed", progress: 100, expectedStartDate: new Date("2026-03-06"), expectedEndDate: new Date("2026-03-20"), actualStartDate: new Date("2026-03-06"), actualEndDate: new Date("2026-03-22"), budgetHours: 200,  description: null, dependsOn: [], assignedTo: ["r.dekker@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "TASK-002B", subject: "Metselwerk",        parentTask: "TASK-002", isMilestone: false, isGroup: false, status: "Open",      progress: 70,  expectedStartDate: new Date("2026-03-23"), expectedEndDate: new Date("2026-04-18"), actualStartDate: new Date("2026-03-24"), actualEndDate: null,                  budgetHours: 480,  description: null, dependsOn: ["TASK-002A"], assignedTo: ["r.dekker@example.nl"], wachtOp: null, wachtOpToelichting: null },
      { id: "TASK-002C", subject: "Dakafdekking",      parentTask: "TASK-002", isMilestone: false, isGroup: false, status: "Open",      progress: 20,  expectedStartDate: new Date("2026-04-19"), expectedEndDate: new Date("2026-05-01"), actualStartDate: null,                  actualEndDate: null,                  budgetHours: 220,  description: null, dependsOn: ["TASK-002B"], assignedTo: [], wachtOp: "Materiaal", wachtOpToelichting: "Dakpannen verwacht week 19." },
      { id: "TASK-003", subject: "Afbouw",             parentTask: null,      isMilestone: false, isGroup: true,  status: "Open",      progress: 10,  expectedStartDate: new Date("2026-05-04"), expectedEndDate: new Date("2026-07-01"), actualStartDate: null,                  actualEndDate: null,                  budgetHours: 450,  description: null,                                                    dependsOn: ["TASK-002"],  assignedTo: [],                       wachtOp: "Materiaal", wachtOpToelichting: null },
      { id: "TASK-004", subject: "Installatie",        parentTask: null,      isMilestone: false, isGroup: true,  status: "Open",      progress: 0,   expectedStartDate: new Date("2026-06-01"), expectedEndDate: new Date("2026-07-15"), actualStartDate: null,                  actualEndDate: null,                  budgetHours: null, description: "E- en W-installaties door onderaannemer.",             dependsOn: ["TASK-002"],  assignedTo: [],                       wachtOp: "Onderaannemer", wachtOpToelichting: null },
      { id: "TASK-005", subject: "Oplevering",         parentTask: null,      isMilestone: true,  isGroup: false, status: "Open",      progress: 0,   expectedStartDate: new Date("2026-08-29"), expectedEndDate: new Date("2026-08-31"), actualStartDate: null,                  actualEndDate: null,                  budgetHours: null, description: null,                                                    dependsOn: ["TASK-003", "TASK-004"], assignedTo: ["m.janssen@example.nl"], wachtOp: null, wachtOpToelichting: null },
    ]);
  },

  async getProjectMilestones(projectId: string): Promise<ProjectTask[]> {
    await new Promise((r) => setTimeout(r, 100));
    const tasks = await mockDetailService.getProjectTasks(projectId);
    return tasks.filter((t) => t.isMilestone);
  },

  async getProjectTimesheets(projectId: string): Promise<TimesheetMap> {
    await new Promise((r) => setTimeout(r, 100));
    if (projectId === "PROJ-0011") {
      return { "T11-01": 1.5, "T11-02": 0.5, "T11-04": 1.5, "T11-05": 7 };
    }
    if (projectId === "PROJ-0023") {
      return { "T23-01": 2, "T23-02": 1, "T23-04": 2, "T23-05": 7 };
    }
    if (projectId === "PROJ-0022") {
      return {
        "T22-01": 332, "T22-02": 1004, "T22-03": 651, "T22-04": 778,
        "T22-05A": 392, "T22-05B": 210,
      };
    }
    if (projectId !== "PROJ-0009") return {};
    return { "TASK-001": 240, "TASK-002": 580, "TASK-003": 80 };
  },

  async getProjectActivity(projectId: string, limit = 20): Promise<ActivityItem[]> {
    await new Promise((r) => setTimeout(r, 100));
    if (projectId === "PROJ-0011") {
      return [
        { id: "a11-001", type: "log",     description: "Factuur SINV-2026-00028 betaald ontvangen",                                                              owner: "Administrator",        createdAt: new Date("2026-05-21T10:00:00") },
        { id: "a11-002", type: "comment", description: "Montage vlekkeloos verlopen. Klant zeer tevreden met het graniet — oplevering volgende week inplannen.",  owner: "j.devries@example.nl", createdAt: new Date("2026-05-13T16:00:00") },
        { id: "a11-003", type: "log",     description: "Status gewijzigd naar Oplevering",                                                                       owner: "j.devries@example.nl", createdAt: new Date("2026-05-13T09:00:00") },
        { id: "a11-004", type: "log",     description: "Werkplaatstekening geaccordeerd door klant",                                                             owner: "j.devries@example.nl", createdAt: new Date("2026-04-22T11:30:00") },
        { id: "a11-005", type: "log",     description: "Project aangemaakt",                                                                                     owner: "Administrator",        createdAt: new Date("2026-04-14T08:00:00") },
      ].slice(0, limit);
    }
    if (projectId === "PROJ-0023") {
      const items0023: ActivityItem[] = [
        { id: "a23-001", type: "comment", description: "Achterwand tegels door klant geplaatst op 27 mei. Afdichting siliconen ingepland voor deze week.", owner: "j.devries@example.nl", createdAt: new Date("2026-05-27T08:45:00") },
        { id: "a23-002", type: "log",     description: "Status gewijzigd naar Oplevering",                                                                   owner: "j.devries@example.nl", createdAt: new Date("2026-05-20T09:00:00") },
        { id: "a23-003", type: "comment", description: "Levering vlot verlopen. Blad past perfect — geen bijsnijden nodig.",                                  owner: "j.devries@example.nl", createdAt: new Date("2026-05-19T14:30:00") },
        { id: "a23-004", type: "log",     description: "Werkplaatstekening geaccordeerd door klant",                                                          owner: "j.devries@example.nl", createdAt: new Date("2026-04-23T11:00:00") },
        { id: "a23-005", type: "log",     description: "Project aangemaakt",                                                                                  owner: "Administrator",        createdAt: new Date("2026-04-07T08:00:00") },
      ];
      return items0023.slice(0, limit);
    }
    if (projectId === "PROJ-0022") {
      const items0022: ActivityItem[] = [
        { id: "a22-001", type: "comment",  description: "Bouwlift nog niet gereserveerd — verhuurder komt niet voor week 23 terug. M. Janssen volgt op.", owner: "m.janssen@example.nl", createdAt: new Date("2026-05-20T10:30:00") },
        { id: "a22-002", type: "log",      description: "Status gewijzigd naar Oplevering",                                                              owner: "m.janssen@example.nl", createdAt: new Date("2026-05-12T08:00:00") },
        { id: "a22-003", type: "comment",  description: "Vloertegels woonlagen 3–6 vertraagd door leverancier. Nieuwe leveringsdatum: week 23.",          owner: "r.dekker@example.nl",  createdAt: new Date("2026-05-05T14:15:00") },
        { id: "a22-004", type: "log",      description: "Meerwerkopdracht goedgekeurd: extra isolatie dak €24.500",                                       owner: "a.vos@example.nl",     createdAt: new Date("2026-04-18T11:00:00") },
        { id: "a22-005", type: "log",      description: "Project aangemaakt",                                                                             owner: "Administrator",        createdAt: new Date("2025-06-01T08:00:00") },
      ];
      return items0022.slice(0, limit);
    }
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
      isGroup: true,
      status: "Open",
      progress: 0,
      expectedStartDate: null,
      expectedEndDate: null,
      actualStartDate: null,
      actualEndDate: null,
      budgetHours: null,
      description: null,
      dependsOn: [],
      assignedTo: [],
      wachtOp: null,
      wachtOpToelichting: null,
    }));
    return { created: [...template.phases], skipped: [], failed: [] };
  },

  async getProjectQuotations(projectId: string): Promise<ProjectQuotation[]> {
    await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
    const quotes = MOCK_QUOTATIONS[projectId] ?? [];
    return quotes.map((q) => ({
      ...q,
      items: q.items.map((item) => {
        const rate = mockRates[`${q.name}:${item.rowName}`] ?? item.rate;
        return { ...item, rate, amount: rate * item.qty };
      }),
    }));
  },

  async getProjectInvoices(projectId: string): Promise<SalesInvoice[]> {
    await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
    return MOCK_INVOICES[projectId] ?? [];
  },

  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
    return MOCK_FILES[projectId] ?? [];
  },

  async updateQuotationItemRate(
    quotationName: string,
    rowName: string,
    newRate: number,
  ): Promise<void> {
    await new Promise((r) => setTimeout(r, 300));
    mockRates[`${quotationName}:${rowName}`] = newRate;
  },
};
