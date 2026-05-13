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

export interface WerksoortConfig {
  readonly id: WerksoortId | null;  // null = onbekend / geen project_type
  readonly label: string;
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
  Nieuwbouw:    { id: "Nieuwbouw",    label: "Nieuwbouw"    },
  Renovatie:    { id: "Renovatie",    label: "Renovatie"    },
  Verbouw:      { id: "Verbouw",      label: "Verbouw"      },
  Sloop:        { id: "Sloop",        label: "Sloop"        },
  Sanering:     { id: "Sanering",     label: "Sanering"     },
  Keukenbladen: { id: "Keukenbladen", label: "Keukenbladen" },
  Onderhoud:    { id: "Onderhoud",    label: "Onderhoud"    },
  Anders:       { id: "Anders",       label: "Anders"       },
};

export function getWerksoortConfig(projectType: string | null | undefined): WerksoortConfig {
  if (!projectType) return DEFAULT_CONFIG;
  return WERKSOORT_CONFIGS[projectType as WerksoortId] ?? DEFAULT_CONFIG;
}
