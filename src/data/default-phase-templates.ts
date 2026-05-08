export interface PhaseTemplate {
  werksoort: string;
  phases: string[];
}

export const DEFAULT_PHASE_TEMPLATES: PhaseTemplate[] = [
  {
    werksoort: "Renovatie",
    phases: ["Sloop", "Ruwbouw", "Afbouw", "Installatie", "Oplevering"],
  },
];

export function getPhaseTemplate(werksoort: string): PhaseTemplate | null {
  return DEFAULT_PHASE_TEMPLATES.find((t) => t.werksoort === werksoort) ?? null;
}
