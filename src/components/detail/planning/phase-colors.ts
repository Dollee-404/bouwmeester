import type { Werksoort } from "../../../data/types";

// ── Bouwmeester basis-kleurenset (5E) ─────────────────────────────────────────
// 12 gedemte tinten, harmonieus met --color-y-teal (#006876).
// deep  = voortgangsbalk  (progress-fill)
// light = baseline-balk   (25%-tint: 0.25×deep + 0.75×#ffffff)

const BM_KLEUREN = {
  teal:       { deep: "#0A7384", light: "#C2DCE0" },
  denim:      { deep: "#3D6B9E", light: "#CFDAE7" },
  indigo:     { deep: "#4350A0", light: "#D0D3E7" },
  lavender:   { deep: "#635CA4", light: "#D8D6E8" },
  moss:       { deep: "#4A7850", light: "#D2DDD3" },
  sage:       { deep: "#5E8B62", light: "#D7E2D8" },
  amber:      { deep: "#B87528", light: "#EDDDC9" },
  terracotta: { deep: "#AA5038", light: "#EAD3CD" },
  dustyRose:  { deep: "#A55868", light: "#E9D5D9" },
  slate:      { deep: "#5C6E7C", light: "#D6DBDE" },
  stone:      { deep: "#787060", light: "#DDDBD7" },
  charcoal:   { deep: "#58596A", light: "#D5D6DA" },
} as const;

type KleurKey = keyof typeof BM_KLEUREN;

// ── Paletten per werksoort (6 vaste slots; kortere werksoorten gebruiken N) ───

const BM_PALETTEN: Record<Werksoort, readonly KleurKey[]> = {
  Nieuwbouw:    ["moss",      "terracotta", "denim",    "slate",     "sage",   "stone"   ],
  Renovatie:    ["terracotta","teal",       "indigo",   "dustyRose", "sage",   "slate"   ],
  Verbouw:      ["amber",     "denim",      "terracotta","sage",     "teal",   "stone"   ],
  Sloop:        ["slate",     "terracotta", "stone",    "indigo",    "moss",   "charcoal"],
  Sanering:     ["denim",     "lavender",   "teal",     "slate",     "indigo", "stone"   ],
  Keukenbladen: ["teal",      "denim",      "lavender", "dustyRose", "amber",  "sage"    ],
  Onderhoud:    ["slate",     "denim",      "sage",     "teal",      "moss",   "stone"   ],
  Anders:       ["charcoal",  "slate",      "stone",    "charcoal",  "slate",  "stone"   ],
};

// Fallback voor projecten zonder werksoort
const FALLBACK_PALET: readonly KleurKey[] = ["slate", "denim", "sage", "teal", "moss", "stone"];

function resolveKey(phaseIndex: number, werksoort: Werksoort | null): KleurKey {
  const palet = werksoort ? BM_PALETTEN[werksoort] : FALLBACK_PALET;
  return palet[phaseIndex % palet.length];
}

/** Diepe fase-kleur — voor de voortgangsbalk. */
export function getPhaseColor(phaseIndex: number, werksoort: Werksoort | null): string {
  return BM_KLEUREN[resolveKey(phaseIndex, werksoort)].deep;
}

/** Lichte fase-kleur — voor de baseline-balk (niet-gestarte voortgang). */
export function getPhaseBaselineColor(phaseIndex: number, werksoort: Werksoort | null): string {
  return BM_KLEUREN[resolveKey(phaseIndex, werksoort)].light;
}
