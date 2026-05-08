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
  status: string;
  progress: number;
  expectedEndDate: Date | null;
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
