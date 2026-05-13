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
  readonly deep: string;   // volle kleur — badge-tekst, accenten
  readonly light: string;  // 25%-tint  — badge-achtergrond
}

export interface WerksoortConfig {
  readonly id: WerksoortId | null;  // null = onbekend / geen project_type
  readonly label: string;
  // 5F: primaire identiteitskleur — badge, eventueel toekomstige card-accenten
  primaryColor?: WerksoortColor;
  // 5E: kleurpalet — één hex-kleur per fase, uitbreidbaar voor lange fase-sets
  palet?: readonly string[];
  // 5G: StatusFlow-pijplijn — geordende array van statusnamen
  statusFlow?: readonly string[];
  // 5I: KPI-set — geordende array van kpi-ids
  kpiSet?: readonly string[];
}

const DEFAULT_CONFIG: WerksoortConfig = {
  id: null,
  label: "Onbekend werksoort",
};

const WERKSOORT_CONFIGS: Record<WerksoortId, WerksoortConfig> = {
  Nieuwbouw:    { id: "Nieuwbouw",    label: "Nieuwbouw",    primaryColor: { deep: "#4A7850", light: "#D2DDD3" } },
  Renovatie:    { id: "Renovatie",    label: "Renovatie",    primaryColor: { deep: "#AA5038", light: "#EAD3CD" } },
  Verbouw:      { id: "Verbouw",      label: "Verbouw",      primaryColor: { deep: "#B87528", light: "#EDDDC9" } },
  Sloop:        { id: "Sloop",        label: "Sloop",        primaryColor: { deep: "#787060", light: "#DDDBD7" } },
  Sanering:     { id: "Sanering",     label: "Sanering",     primaryColor: { deep: "#3D6B9E", light: "#CFDAE7" } },
  Keukenbladen: { id: "Keukenbladen", label: "Keukenbladen", primaryColor: { deep: "#0A7384", light: "#C2DCE0" } },
  Onderhoud:    { id: "Onderhoud",    label: "Onderhoud",    primaryColor: { deep: "#5E8B62", light: "#D7E2D8" } },
  Anders:       { id: "Anders",       label: "Anders",       primaryColor: { deep: "#58596A", light: "#D5D6DA" } },
};

export function getWerksoortConfig(projectType: string | null | undefined): WerksoortConfig {
  if (!projectType) return DEFAULT_CONFIG;
  return WERKSOORT_CONFIGS[projectType as WerksoortId] ?? DEFAULT_CONFIG;
}
