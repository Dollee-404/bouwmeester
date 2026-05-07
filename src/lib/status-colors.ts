import type { BouwmeesterStatus } from "../data/types";

export const STATUS_COLORS: Record<BouwmeesterStatus, string> = {
  "Lead":          "#94a3b8",
  "Calculatie":    "#378ADD",
  "Gegund":        "#1e40af",
  "In uitvoering": "#BA7517",
  "Oplevering":    "#D4537E",
  "Afgerond":      "#1D9E75",
  "Verloren":      "#94a3b8",
  "Geannuleerd":   "#475569",
};
