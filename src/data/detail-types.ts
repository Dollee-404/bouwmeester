import type { BouwmeesterStatus, Werksoort } from "./types";

export interface ProjectTeamMember {
  user: string;
  fullName: string;
  email: string;
  role: string | null;
}

export interface ProjectDetail {
  id: string;
  projectName: string;
  customerName: string;
  customerAddress: string | null;
  status: BouwmeesterStatus;
  werksoort: Werksoort | null;
  startDate: Date | null;
  endDate: Date | null;
  percentComplete: number;
  budgetSales: number;
  budgetHours: number | null;
  billedAmount: number;
  estimatedCosting: number;
  isWeatherDependent: boolean;
  isArchived: boolean;
  team: ProjectTeamMember[];
}

export interface ProjectTask {
  id: string;
  subject: string;
  parentTask: string | null;
  isMilestone: boolean;
  isGroup: boolean;
  status: string;
  progress: number;
  expectedStartDate: Date | null;
  expectedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  budgetHours: number | null;
  description: string | null;
  dependsOn: string[];
  assignedTo: string[];
  wachtOp: string | null;
  wachtOpToelichting: string | null;
}

export type TimesheetMap = Record<string, number>;

export interface ActivityItem {
  id: string;
  type: "comment" | "log";
  description: string;
  owner: string;
  createdAt: Date;
}

export interface ProjectFinancials {
  aanneemsom: number;
  meerwerk: number;
  gefactureerd: number;
  openstaand: number;
}

export interface CreatePhasesResult {
  created: string[];
  skipped: string[];
  failed: string[];
}

export interface QuotationItem {
  /** ERPNext child-row docname (bijv. "KBF-QTN-ITEM-0001"), nodig voor update */
  rowName: string;
  itemCode: string;
  itemName: string;
  /** Beschrijving — HTML gestript voor weergave */
  description: string;
  qty: number;
  uom: string;
  /** Prijs per eenheid — initieel 0, door kantoor in te vullen */
  rate: number;
  /** Berekend: qty * rate */
  amount: number;
}

export interface ProjectQuotation {
  /** ERPNext Quotation-docname (bijv. "QTN-0001") */
  name: string;
  customerName: string;
  transactionDate: Date;
  /** Datum van de opname (kbf_meetdatum) */
  meetdatum: Date | null;
  /** Naam van de inmeter/verkoper (kbf_inmeter) */
  inmeter: string | null;
  items: QuotationItem[];
}
