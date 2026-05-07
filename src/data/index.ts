import { INSTANCE_ID } from "../bridge";
import { erpnextService } from "./projects-service-erpnext";
import { mockService } from "./projects-service-mock";
import type { ProjectsService } from "./projects-service";

export const projectsService: ProjectsService = INSTANCE_ID ? erpnextService : mockService;

export type { ProjectsService };
export type { Project, BouwmeesterStatus, Werksoort, ListOptions } from "./types";
