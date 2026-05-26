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
  /** Bestandspad van de werkplaatstekening PDF (kbf_tekening_pdf), bijv. "/files/tekening.pdf" */
  tekenPdf: string | null;
  items: QuotationItem[];
}

/** Minimale data voor een opname-kaartje — Quotation zonder kbf_project */
export interface UnlinkedQuotation {
  /** ERPNext Quotation-docname, bijv. "QTN-0001" */
  name: string;
  /** party_name — ERPNext Customer-docname */
  customerName: string;
  transactionDate: Date;
  /** Datum van de keukenblad-opname (kbf_meetdatum) */
  meetdatum: Date | null;
  /** Naam van de inmeter/verkoper (kbf_inmeter) */
  inmeter: string | null;
  /** Totaal aantal regelitems voor weergave op de kaart */
  itemCount: number;
}

export interface ProjectFile {
  /** ERPNext File docname (bijv. "FILE-0001") */
  name: string;
  /** Originele bestandsnaam (bijv. "tekening-v2.pdf") */
  fileName: string;
  /** Relatief URL-pad in ERPNext (bijv. "/files/tekening-v2.pdf") */
  fileUrl: string;
  /** Bestandsgrootte in bytes — null als ERPNext het niet registreert */
  fileSize: number | null;
  createdAt: Date;
  isPrivate: boolean;
}

export type InvoiceStatus = "Paid" | "Overdue" | "Unpaid" | "Partly Paid" | "Return";

export interface SalesInvoice {
  /** ERPNext Sales Invoice docname (bijv. "SINV-0001") */
  name: string;
  postingDate: Date;
  dueDate: Date | null;
  grandTotal: number;
  /** Nog niet betaald bedrag — 0 bij volledig betaalde factuur */
  outstandingAmount: number;
  status: InvoiceStatus;
}
