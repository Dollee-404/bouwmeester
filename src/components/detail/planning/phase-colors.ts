// ── Fase-kleurenpalet — Palet 2B (Koele tinten) ──────────────────────────────
//
// Herbruikbaar voor: GanttStrook, PhaseCards (Overzicht-tab), fase-tags.
//
// Palet bevat 8 gedemde koele tints, harmonisch met --color-y-teal (#006876).
// Items 0-4: kernreeks voor standaard nieuwbouw (5 fases).
// Items 5-7: uitbreidingen voor projecten met 6-8 fases.
// Bij 9+ fases herhaalt het palet via modulo — kleuren blijven deterministisch,
// twee fases kunnen dan dezelfde tint krijgen (known limitation bij ≥9 fases).

// Diepe tints — voortgang (progress-balk)
const COOL_PALETTE = [
  "#4d8c8a", // 0 — teal         (fundering / grondwerk)
  "#5060a0", // 1 — indigo       (ruwbouw / casco)
  "#3d6898", // 2 — denim        (installaties)
  "#5a6880", // 3 — slate-blauw  (afwerking / afbouw)
  "#6070a0", // 4 — dusty-indigo (buitenterrein)  ← was #7868a0, gedempt
  "#387880", // 5 — oceaanteal   (uitbreiding)
  "#485870", // 6 — donker slate (uitbreiding)
  "#6888a0", // 7 — staalsblauw  (uitbreiding)
] as const;

// Lichte tints — baseline-balk (L≈85%, S≈20%, zelfde hue als diep)
const COOL_PALETTE_LIGHT = [
  "#c6e2e1", // 0 — licht teal
  "#c6c8e4", // 1 — licht indigo
  "#bed6ea", // 2 — licht denim
  "#cad4df", // 3 — licht slate
  "#c8cce8", // 4 — licht dusty-indigo
  "#bddde0", // 5 — licht oceaanteal
  "#c4ccd8", // 6 — licht donker slate
  "#c4d6e6", // 7 — licht staalsblauw
] as const;

// Vaste mapping voor standaard nieuwbouw-fasenamen.
// Partial match, case-insensitief. Eerste match wint.
const KNOWN_PHASES: [string, number][] = [
  ["grondwerk",    0], ["fundering",   0], ["sloopwerk",  0],
  ["ruwbouw",      1], ["casco",       1], ["metselwerk", 1],
  ["installatie",  2], ["elektra",     2], ["loodgieter", 2], ["hvac", 2], ["cv-", 2],
  ["afwerking",    3], ["afbouw",      3], ["schilderwerk", 3], ["stukadoor", 3],
  ["buitenterrein",4], ["terrein",     4], ["bestrating", 4], ["tuin", 4],
];

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getPaletteIndex(subject: string): number {
  const lower = subject.toLowerCase().trim();
  for (const [key, idx] of KNOWN_PHASES) {
    if (lower.includes(key)) return idx;
  }
  return stableHash(lower) % COOL_PALETTE.length;
}

/** Diepe fase-kleur — voor de voortgangsbalk. */
export function getPhaseColor(subject: string): string {
  return COOL_PALETTE[getPaletteIndex(subject)];
}

/** Lichte fase-kleur — voor de baseline-balk (niet-gestarte voortgang). */
export function getPhaseBaselineColor(subject: string): string {
  return COOL_PALETTE_LIGHT[getPaletteIndex(subject)];
}
