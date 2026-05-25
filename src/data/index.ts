import { INSTANCE_ID } from "../bridge";
import { erpnextService } from "./projects-service-erpnext";
import { mockService } from "./projects-service-mock";
import { erpnextQuotationsService } from "./quotations-service-erpnext";
import { mockQuotationsService } from "./quotations-service-mock";
import type { ProjectsService } from "./projects-service";
import type { QuotationsService } from "./quotations-service";

export const projectsService: ProjectsService = INSTANCE_ID ? erpnextService : mockService;
export const quotationsService: QuotationsService = INSTANCE_ID
  ? erpnextQuotationsService
  : mockQuotationsService;

export type { ProjectsService, QuotationsService };
export type { Project, BouwmeesterStatus, Werksoort, ListOptions } from "./types";
