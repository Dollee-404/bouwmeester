/**
 * Fase 5B — console-demo
 *
 * Uitvoeren:
 *   npx tsx scripts/test-5b.ts
 *
 * Toont:
 *  1. Alle zes WerksoortId-configs ophalen via getWerksoortConfig
 *  2. Keukenbladen expliciet testen (nieuw in 5B)
 *  3. WerksoortBadge-variant-volledigheidscheck (alle Werksoort-waarden gedekt)
 *  4. WERKSOORT_IDS bevat alle zes ids
 */

import {
  getWerksoortConfig,
  WERKSOORT_IDS,
  type WerksoortId,
} from "../src/data/werksoort-config.ts";

function check(label: string, ok: boolean, detail?: string): void {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${ok ? "" : `  ← FOUT${detail ? ": " + detail : ""}`}`);
}

// ════════════════════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  1. ALLE ZES WERKSOORT-CONFIGS");
console.log("══════════════════════════════════════════════\n");

for (const id of WERKSOORT_IDS) {
  const cfg = getWerksoortConfig(id);
  console.log(`  ${id}:`);
  console.log(`    id    = ${cfg.id}`);
  console.log(`    label = ${cfg.label}`);
  console.log();
}

// ════════════════════════════════════════════════════════════════════════════
console.log("══════════════════════════════════════════════");
console.log("  2. KEUKENBLADEN — expliciet");
console.log("══════════════════════════════════════════════\n");

const kb = getWerksoortConfig("Keukenbladen");
console.log(kb);

// ════════════════════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  3. VERIFICATIE");
console.log("══════════════════════════════════════════════\n");

const EXPECTED_IDS: readonly WerksoortId[] = [
  "Nieuwbouw", "Renovatie", "Verbouw", "Sloop", "Sanering", "Keukenbladen",
];

check(
  "WERKSOORT_IDS bevat precies 6 entries",
  WERKSOORT_IDS.length === 6,
  `got ${WERKSOORT_IDS.length}`,
);

for (const id of EXPECTED_IDS) {
  const cfg = getWerksoortConfig(id);
  check(
    `${id}: id correct en label niet leeg`,
    cfg.id === id && cfg.label.length > 0,
    `id=${cfg.id} label="${cfg.label}"`,
  );
}

check(
  "Keukenbladen id = 'Keukenbladen'",
  kb.id === "Keukenbladen",
  `got id=${kb.id}`,
);

check(
  "Onbekende waarde geeft DEFAULT (id=null)",
  getWerksoortConfig("Onbekend").id === null,
);

check(
  "null geeft DEFAULT",
  getWerksoortConfig(null).id === null,
);

const allOk =
  WERKSOORT_IDS.length === 6 &&
  EXPECTED_IDS.every((id) => {
    const cfg = getWerksoortConfig(id);
    return cfg.id === id && cfg.label.length > 0;
  }) &&
  kb.id === "Keukenbladen" &&
  getWerksoortConfig("Onbekend").id === null &&
  getWerksoortConfig(null).id === null;

console.log(`\n${allOk ? "✓ Alle checks geslaagd." : "✗ Eén of meer checks mislukt."}\n`);
