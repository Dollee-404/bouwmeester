export interface PhaseTemplate {
  werksoort: string;
  phases: string[];
}

export const DEFAULT_PHASE_TEMPLATES: PhaseTemplate[] = [
  {
    werksoort: "Renovatie",
    phases: ["Sloop", "Ruwbouw", "Afbouw", "Installatie", "Oplevering"],
  },
  {
    werksoort: "Verbouw",
    phases: ["Sloop", "Ruwbouw", "Afbouw", "Installatie", "Oplevering"],
  },
  {
    werksoort: "Nieuwbouw",
    phases: ["Grondwerk", "Fundering", "Ruwbouw", "Gevel", "Afbouw", "Installaties", "Oplevering"],
  },
  {
    werksoort: "Sloop",
    phases: ["Voorbereiding", "Asbest & gevaarlijke stoffen", "Sloop", "Afvoer puin", "Terreinopruiming"],
  },
  {
    werksoort: "Onderhoud",
    phases: ["Inspectie", "Voorbereiding", "Uitvoering", "Oplevering"],
  },
];

export function getPhaseTemplate(werksoort: string): PhaseTemplate | null {
  return DEFAULT_PHASE_TEMPLATES.find((t) => t.werksoort === werksoort) ?? null;
}
