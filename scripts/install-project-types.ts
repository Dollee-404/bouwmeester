/**
 * 5A — installeert vijf bouw-specifieke Project Types in ERPNext.
 *
 * Idempotent: bestaande types worden overgeslagen.
 * Uitvoeren: npx tsx scripts/install-project-types.ts
 */

const HOST  = "https://drechtstedenbouw-erp.prilk.cloud";
const TOKEN = "token f252f378823b06a:9d4575aa1c2faad";

const BOUWMEESTER_PROJECT_TYPES = [
  "Nieuwbouw",
  "Renovatie",
  "Verbouw",
  "Sloop",
  "Sanering",
] as const;

async function apiFetch(method: string, body: Record<string, unknown>): Promise<unknown> {
  const params = new URLSearchParams(
    Object.fromEntries(
      Object.entries(body).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]),
    ),
  );
  const res = await fetch(`${HOST}/api/method/${method}`, {
    method: "POST",
    headers: { Authorization: TOKEN, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const json = await res.json() as Record<string, unknown>;
  if (json.exception || json.exc_type) throw new Error(String(json.exception ?? json.exc_type));
  return json.message;
}

async function getExistingProjectTypes(): Promise<string[]> {
  const result = await apiFetch("frappe.client.get_list", {
    doctype: "Project Type",
    fields: JSON.stringify(["name"]),
    limit_page_length: 50,
  }) as Array<{ name: string }>;
  return result.map((r) => r.name);
}

async function insertProjectType(name: string): Promise<void> {
  await apiFetch("frappe.client.insert", {
    doc: JSON.stringify({ doctype: "Project Type", project_type: name }),
  });
}

// ── Uitvoering ────────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════");
console.log("  5A — INSTALLATIE PROJECT TYPES");
console.log("══════════════════════════════════════════════\n");

console.log("Stap 1 — Bestaande Project Types in ERPNext:\n");
const existing = await getExistingProjectTypes();
console.log(`  Gevonden (${existing.length}): ${existing.join(", ")}\n`);

const toInstall = BOUWMEESTER_PROJECT_TYPES.filter((t) => !existing.includes(t));

if (toInstall.length === 0) {
  console.log("  ✓ Alle vijf Project Types al aanwezig — niets te installeren.\n");
} else {
  console.log(`Stap 2 — Installeren (${toInstall.length} ontbreken):\n`);
  for (const name of toInstall) {
    process.stdout.write(`  "${name}" ... `);
    try {
      await insertProjectType(name);
      console.log("✓");
    } catch (e) {
      console.log(`✗  ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
    }
  }
}

console.log("\nStap 3 — Hercontrole:\n");
const after = await getExistingProjectTypes();
for (const name of BOUWMEESTER_PROJECT_TYPES) {
  console.log(`  ${after.includes(name) ? "✓" : "✗"} ${name}`);
}
console.log();
