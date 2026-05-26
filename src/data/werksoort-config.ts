import type { BouwmeesterStatus } from "./types";

export type WerksoortId = "Nieuwbouw" | "Renovatie" | "Verbouw" | "Sloop" | "Sanering" | "Keukenbladen" | "Onderhoud" | "Anders";

export const WERKSOORT_IDS: readonly WerksoortId[] = [
  "Nieuwbouw",
  "Renovatie",
  "Verbouw",
  "Sloop",
  "Sanering",
  "Keukenbladen",
  "Onderhoud",
  "Anders",
];

export interface WerksoortColor {
  readonly deep: string;
  readonly light: string;
}

/** Één stap in de werksoort-specifieke StatusFlow-pijplijn. */
export interface StatusFlowStep {
  /** Echte ERPNext-statuswaarde — gebruikt voor voortgangsberekening. */
  status: BouwmeesterStatus;
  /** Optioneel afwijkend weergavelabel voor deze werksoort (bijv. "Uitvoering" voor Sloop). */
  label?: string;
}

/** Optionele werksoort-specifieke labels voor de vier KPI-blokken. */
export interface KpiLabelOverrides {
  voortgang?: string;
  budget?: string;
  uren?: string;
  planning?: string;
}

export interface WerksoortConfig {
  readonly id: WerksoortId | null;
  readonly label: string;
  // 5F: primaire identiteitskleur — badge, card-accenten
  primaryColor?: WerksoortColor;
  // 5E: kleurpalet — één hex per fase
  palet?: readonly string[];
  // 5G: StatusFlow-pijplijn — undefined = gebruik standaard STATUS_ORDER
  statusFlow?: readonly StatusFlowStep[];
  // 5I: KPI-label-overrides — undefined = gebruik standaard i18n labels
  kpiSet?: KpiLabelOverrides;
}

const DEFAULT_CONFIG: WerksoortConfig = {
  id: null,
  label: "Onbekend werksoort",
};

const WERKSOORT_CONFIGS: Record<WerksoortId, WerksoortConfig> = {
  Nieuwbouw:    { id: "Nieuwbouw",    label: "Nieuwbouw",    primaryColor: { deep: "#4A7850", light: "#D2DDD3" } },
  Renovatie:    { id: "Renovatie",    label: "Renovatie",    primaryColor: { deep: "#AA5038", light: "#EAD3CD" } },
  Verbouw:      { id: "Verbouw",      label: "Verbouw",      primaryColor: { deep: "#B87528", light: "#EDDDC9" } },
  Sloop: {
    id: "Sloop",
    label: "Sloop",
    primaryColor: { deep: "#787060", light: "#DDDBD7" },
    statusFlow: [
      { status: "Lead" },
      { status: "Calculatie" },
      { status: "Gegund" },
      { status: "In uitvoering", label: "Uitvoering" },
      { status: "Afgerond" },
    ],
    kpiSet: { voortgang: "Afvoer %" },
  },
  Sanering: {
    id: "Sanering",
    label: "Sanering",
    primaryColor: { deep: "#3D6B9E", light: "#CFDAE7" },
    statusFlow: [
      { status: "Lead" },
      { status: "Calculatie", label: "Onderzoek" },
      { status: "Gegund" },
      { status: "In uitvoering", label: "Sanering" },
      { status: "Oplevering", label: "Vrijgave" },
      { status: "Afgerond" },
    ],
    kpiSet: { voortgang: "Materiaal (m³)" },
  },
  Keukenbladen: { id: "Keukenbladen", label: "Keukenbladen", primaryColor: { deep: "#0A7384", light: "#C2DCE0" } },
  Onderhoud:    { id: "Onderhoud",    label: "Onderhoud",    primaryColor: { deep: "#5E8B62", light: "#D7E2D8" } },
  Anders:       { id: "Anders",       label: "Anders",       primaryColor: { deep: "#58596A", light: "#D5D6DA" } },
};

export function getWerksoortConfig(projectType: string | null | undefined): WerksoortConfig {
  if (!projectType) return DEFAULT_CONFIG;
  return WERKSOORT_CONFIGS[projectType as WerksoortId] ?? DEFAULT_CONFIG;
}
