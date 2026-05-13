import type { Project, BouwmeesterStatus, Werksoort, ListOptions } from "./types";

export type { ListOptions };

export interface CreateProjectParams {
  projectName: string;
  werksoort: Werksoort;
  customer: string | null;
  startDate: string | null; // YYYY-MM-DD
}

export interface ProjectsService {
  list(options?: ListOptions): Promise<Project[]>;
  getOne(id: string): Promise<Project>;
  updateStatus(id: string, newStatus: BouwmeesterStatus): Promise<void>;
  createProject(params: CreateProjectParams): Promise<string>; // returns ERPNext project name
}
