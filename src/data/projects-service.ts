import type { Project, BouwmeesterStatus, ListOptions } from "./types";

export type { ListOptions };

export interface ProjectsService {
  list(options?: ListOptions): Promise<Project[]>;
  getOne(id: string): Promise<Project>;
  updateStatus(id: string, newStatus: BouwmeesterStatus): Promise<void>;
}
