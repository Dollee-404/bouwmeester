/**
 * Fase 5A — console-demo
 *
 * Uitvoeren:
 *   npx tsx scripts/test-5a.ts
 *
 * Toont:
 *  1. getWerksoortConfig met bekende werksoort (Nieuwbouw)
 *  2. getWerksoortConfig met onbekende waarde → neutrale default, geen crash
 *  3. getWerksoortConfig met null/undefined → neutrale default
 *  4. Alle vijf IDs controleren op label-aanwezigheid
 */

import {
  getWerksoortConfig,
  WERKSOORT_IDS,
} from "../src/data/werksoort-config.ts";

// ════════════════════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  1. BEKENDE WERKSOORT: Nieuwbouw");
console.log("══════════════════════════════════════════════\n");

const nieuwbouw = getWerksoortConfig("Nieuwbouw");
console.log(nieuwbouw);

// ════════════════════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  2. ONBEKENDE WAARDE: 'Onbekend'");
console.log("══════════════════════════════════════════════\n");

const onbekend = getWerksoortConfig("Onbekend");
console.log(onbekend);

// ════════════════════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  3. NULL / UNDEFINED → DEFAULT");
console.log("══════════════════════════════════════════════\n");

const viaNull      = getWerksoortConfig(null);
const viaUndefined = getWerksoortConfig(undefined);
console.log("null     →", viaNull);
console.log("undefined →", viaUndefined);

// ════════════════════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  4. ALLE VIJF IDs — label aanwezig?");
console.log("══════════════════════════════════════════════\n");

function check(label: string, ok: boolean, detail?: string): void {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${ok ? "" : `  ← FOUT${detail ? `: ${detail}` : ""}`}`);
}

for (const id of WERKSOORT_IDS) {
  const cfg = getWerksoortConfig(id);
  check(`${id}: id="${cfg.id}"  label="${cfg.label}"`, cfg.id === id && cfg.label.length > 0);
}

// ════════════════════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  5. VERIFICATIE");
console.log("══════════════════════════════════════════════\n");

check(
  "Nieuwbouw heeft id en label",
  nieuwbouw.id === "Nieuwbouw" && nieuwbouw.label.length > 0,
);
check(
  "Onbekende waarde geeft DEFAULT (id=null)",
  onbekend.id === null,
  `got id=${onbekend.id}`,
);
check(
  "null geeft DEFAULT (id=null)",
  viaNull.id === null,
  `got id=${viaNull.id}`,
);
check(
  "undefined geeft DEFAULT (id=null)",
  viaUndefined.id === null,
  `got id=${viaUndefined.id}`,
);
check(
  "Alle 5 IDs gekend",
  WERKSOORT_IDS.every((id) => getWerksoortConfig(id).id === id),
);

const allOk =
  nieuwbouw.id === "Nieuwbouw" &&
  onbekend.id === null &&
  viaNull.id === null &&
  viaUndefined.id === null &&
  WERKSOORT_IDS.every((id) => getWerksoortConfig(id).id === id);

console.log(`\n${allOk ? "✓ Alle checks geslaagd." : "✗ Eén of meer checks mislukt."}\n`);
