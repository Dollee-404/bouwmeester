import type { BouwmeesterStatus } from "../../data/types";
export { STATUS_COLORS } from "../../lib/status-colors";

export const STATUS_ORDER: BouwmeesterStatus[] = [
  "Lead",
  "Calculatie",
  "Gegund",
  "In uitvoering",
  "Oplevering",
  "Afgerond",
];

export const ARCHIVED_STATUS_ORDER: BouwmeesterStatus[] = [
  "Verloren",
  "Geannuleerd",
];

export const STATUS_LABEL_KEYS: Record<BouwmeesterStatus, string> = {
  "Lead":          "status.lead",
  "Calculatie":    "status.calculatie",
  "Gegund":        "status.gegund",
  "In uitvoering": "status.in_uitvoering",
  "Oplevering":    "status.oplevering",
  "Afgerond":      "status.afgerond",
  "Verloren":      "status.verloren",
  "Geannuleerd":   "status.geannuleerd",
};
