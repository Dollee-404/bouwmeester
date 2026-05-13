/**
 * 5C — migreert custom_werksoort → project_type op alle bestaande projecten.
 *
 * Gebruik:
 *   npx tsx scripts/migrate-werksoort.ts          → dry-run (geen schrijven)
 *   npx tsx scripts/migrate-werksoort.ts --run     → echte migratie
 *
 * Idempotent: projecten die al een project_type hebben worden overgeslagen.
 * Onbekende waarden in custom_werksoort (bijv. "Onderhoud") worden gelogd
 * en niet gemigreerd — ze vallen terug op de custom_werksoort-fallback in
 * de service.
 *
 * Known limitation: custom_werksoort wordt in RONDE 6+ verwijderd nadat alle
 * systemen volledig op project_type zijn overgegaan.
 */

const HOST    = "https://drechtstedenbouw-erp.prilk.cloud";
const TOKEN   = "token f252f378823b06a:9d4575aa1c2faad";
const DRY_RUN = !process.argv.includes("--run");

const KNOWN_WERKSOORTEN = new Set(["Nieuwbouw", "Renovatie", "Verbouw", "Sloop", "Sanering", "Keukenbladen", "Onderhoud"]);

async function apiFetch(method: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(body).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)])),
  );
  const res = await fetch(`${HOST}/api/method/${method}`, {
    method: "POST",
    headers: { Authorization: TOKEN, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  return res.json() as Promise<Record<string, unknown>>;
}

console.log(`\n══════════════════════════════════════════════`);
console.log(`  5C — MIGRATIE custom_werksoort → project_type`);
console.log(`  Modus: ${DRY_RUN ? "DRY-RUN (geen wijzigingen)" : "ECHTE MIGRATIE"}`);
console.log(`══════════════════════════════════════════════\n`);

// Stap 1: alle projecten ophalen
const result = await apiFetch("frappe.client.get_list", {
  doctype: "Project",
  fields: JSON.stringify(["name", "project_name", "custom_werksoort", "project_type"]),
  limit_page_length: 500,
  filters: JSON.stringify([["status", "!=", "Cancelled"]]),
});
const projects = result.message as Array<{
  name: string;
  project_name: string;
  custom_werksoort: string | null;
  project_type: string | null;
}> ?? [];

console.log(`Projecten gevonden: ${projects.length}\n`);

// Stap 2: categoriseren
const toMigrate   = projects.filter(p => p.custom_werksoort && KNOWN_WERKSOORTEN.has(p.custom_werksoort) && !p.project_type);
const alreadyDone = projects.filter(p => p.project_type);
const unknown     = projects.filter(p => p.custom_werksoort && !KNOWN_WERKSOORTEN.has(p.custom_werksoort));
const empty       = projects.filter(p => !p.custom_werksoort && !p.project_type);

console.log("── Categorisatie ──────────────────────────────");
console.log(`  Te migreren      : ${toMigrate.length}`);
console.log(`  Al gemigreerd    : ${alreadyDone.length}`);
console.log(`  Onbekend (skip)  : ${unknown.length}`);
console.log(`  Leeg (skip)      : ${empty.length}`);
console.log();

// Stap 3: toon migratie-plan
console.log("── Migratie-plan ──────────────────────────────");
for (const p of toMigrate) {
  console.log(`  ${p.name.padEnd(14)} "${p.custom_werksoort}" → project_type="${p.custom_werksoort}"`);
}
if (toMigrate.length === 0) console.log("  (niets te migreren)");
console.log();

if (alreadyDone.length > 0) {
  console.log("── Al gemigreerd (skip) ───────────────────────");
  for (const p of alreadyDone) {
    console.log(`  ${p.name.padEnd(14)} project_type="${p.project_type}"`);
  }
  console.log();
}

if (unknown.length > 0) {
  console.log("── Onbekende waarden (skip + log) ─────────────");
  for (const p of unknown) {
    console.log(`  ${p.name.padEnd(14)} custom_werksoort="${p.custom_werksoort}" — NIET gemigreerd`);
  }
  console.log();
}

if (empty.length > 0) {
  console.log("── Leeg (geen actie) ──────────────────────────");
  for (const p of empty) {
    console.log(`  ${p.name.padEnd(14)} custom_werksoort=leeg, project_type=leeg`);
  }
  console.log();
}

if (DRY_RUN) {
  console.log("══════════════════════════════════════════════");
  console.log("  DRY-RUN klaar — geen wijzigingen gemaakt.");
  console.log("  Voer uit met --run voor echte migratie.");
  console.log("══════════════════════════════════════════════\n");
  process.exit(0);
}

// Stap 4: echte migratie
console.log("── Uitvoering ─────────────────────────────────");
let migrated = 0;
let failed   = 0;

for (const p of toMigrate) {
  process.stdout.write(`  ${p.name}: "${p.custom_werksoort}" ... `);
  const setResult = await apiFetch("frappe.client.set_value", {
    doctype: "Project",
    name: p.name,
    fieldname: "project_type",
    value: p.custom_werksoort as string,
  });
  if (setResult.exception || setResult.exc_type) {
    console.log(`✗ ${setResult.exception ?? setResult.exc_type}`);
    failed++;
  } else {
    console.log("✓");
    migrated++;
  }
}
console.log();

// Stap 5: hercontrole
console.log("── Hercontrole ────────────────────────────────");
const after = await apiFetch("frappe.client.get_list", {
  doctype: "Project",
  fields: JSON.stringify(["name", "custom_werksoort", "project_type"]),
  limit_page_length: 500,
  filters: JSON.stringify([["status", "!=", "Cancelled"]]),
});
const afterRows = after.message as Array<{ name: string; custom_werksoort: string | null; project_type: string | null }> ?? [];

for (const p of afterRows) {
  const status = p.project_type
    ? `project_type="${p.project_type}"`
    : p.custom_werksoort
      ? `project_type=leeg (fallback: custom_werksoort="${p.custom_werksoort}")`
      : "beide leeg";
  console.log(`  ${p.name.padEnd(14)} ${status}`);
}

console.log(`\n══════════════════════════════════════════════`);
console.log(`  Gemigreerd: ${migrated}   Mislukt: ${failed}   Overgeslagen: ${unknown.length + empty.length}`);
console.log(`══════════════════════════════════════════════\n`);
