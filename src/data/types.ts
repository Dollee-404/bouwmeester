export type BouwmeesterStatus =
  | "Lead"
  | "Calculatie"
  | "Gegund"
  | "In uitvoering"
  | "Oplevering"
  | "Afgerond"
  | "Verloren"
  | "Geannuleerd";

export type Werksoort =
  | "Renovatie"
  | "Nieuwbouw"
  | "Sloop"
  | "Verbouw"
  | "Onderhoud";

export interface Project {
  id: string;
  projectName: string;
  customerName: string;
  status: BouwmeesterStatus;
  werksoort: Werksoort | null;
  startDate: Date | null;
  endDate: Date | null;
  percentComplete: number;
  budgetSales: number;
  budgetHours: number | null;
  billedAmount: number;
  estimatedCosting: number;
  projectLeader: string | null;
  isWeatherDependent: boolean;
  isArchived: boolean;
}

export interface ListOptions {
  status?: BouwmeesterStatus;
  werksoort?: Werksoort;
  search?: string;
  includeArchived?: boolean;
}
