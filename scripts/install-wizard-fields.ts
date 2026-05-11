/**
 * Installeert ontbrekende custom fields via exact dezelfde logica als de wizard:
 *   checkRequiredFields()  → welke velden missen?
 *   installCustomFields()  → frappe.client.insert per ontbrekend veld
 *
 * Dezelfde REQUIRED_CUSTOM_FIELDS-spec als custom-fields-spec.ts.
 * Dezelfde frappe.client.insert call als setup-check.ts:installCustomFields.
 *
 * Uitvoeren:
 *   npx tsx scripts/install-wizard-fields.ts
 */

import { REQUIRED_CUSTOM_FIELDS, type CustomFieldSpec } from "../src/data/custom-fields-spec.ts";

const HOST  = "https://drechtstedenbouw-erp.prilk.cloud";
const TOKEN = "token f252f378823b06a:9d4575aa1c2faad";

async function callMethod(method: string, args: Record<string, unknown>): Promise<unknown> {
  const params = new URLSearchParams({ cmd: method, ...Object.fromEntries(
    Object.entries(args).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]),
  )});
  const res = await fetch(`${HOST}/api/method/${method}`, {
    method: "POST",
    headers: {
      Authorization: TOKEN,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const json = await res.json() as Record<string, unknown>;
  if (json.exception || json.exc_type) {
    throw new Error(String(json.exception ?? json.exc_type));
  }
  return json.message;
}

// ── Stap 1: checkRequiredFields — zelfde logica als setup-check.ts ────────────
async function checkRequiredFields(): Promise<CustomFieldSpec[]> {
  const allDts = [...new Set(REQUIRED_CUSTOM_FIELDS.map((f) => f.dt))];
  const allNames = REQUIRED_CUSTOM_FIELDS.map((f) => f.fieldname);

  const existing = await callMethod("frappe.client.get_list", {
    doctype: "Custom Field",
    fields: JSON.stringify(["fieldname", "dt"]),
    filters: JSON.stringify([
      ["dt", "in", allDts],
      ["fieldname", "in", allNames],
    ]),
    limit_page_length: 50,
  }) as Array<{ fieldname: string; dt: string }>;

  const existingKeys = new Set(existing.map((f) => `${f.dt}::${f.fieldname}`));
  return REQUIRED_CUSTOM_FIELDS.filter((f) => !existingKeys.has(`${f.dt}::${f.fieldname}`));
}

// ── Stap 2: installCustomFields — zelfde logica als setup-check.ts ────────────
async function installField(spec: CustomFieldSpec): Promise<void> {
  await callMethod("frappe.client.insert", {
    doc: JSON.stringify({ doctype: "Custom Field", ...spec }),
  });
}

// ── Uitvoering ────────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════");
console.log("  WIZARD-INSTALLATIE (feature branch code)");
console.log("══════════════════════════════════════════════\n");

console.log(`Spec bevat ${REQUIRED_CUSTOM_FIELDS.length} velden over doctypes: ${[...new Set(REQUIRED_CUSTOM_FIELDS.map((f) => f.dt))].join(", ")}\n`);

console.log("Stap 1 — checkRequiredFields (welke velden missen?):");
const missing = await checkRequiredFields();

if (missing.length === 0) {
  console.log("  ✓ Alle velden al aanwezig — niets te installeren.");
} else {
  for (const f of missing) {
    console.log(`  ontbreekt: ${f.dt} → ${f.fieldname} (${f.fieldtype})`);
  }
  console.log(`\nStap 2 — installCustomFields (${missing.length} veld${missing.length !== 1 ? "en" : ""}):`);

  for (const spec of missing) {
    process.stdout.write(`  Installeren ${spec.dt} → ${spec.fieldname} ... `);
    try {
      await installField(spec);
      console.log("✓");
    } catch (e) {
      console.log(`✗  ${e instanceof Error ? e.message.split("\n")[0] : e}`);
    }
  }
}

console.log("\nStap 3 — hercontrole na installatie:");
const stillMissing = await checkRequiredFields();
if (stillMissing.length === 0) {
  console.log("  ✓ Alle velden aanwezig in ERPNext.\n");
} else {
  console.log(`  ✗ Nog ${stillMissing.length} veld(en) ontbreken:`);
  for (const f of stillMissing) {
    console.log(`    ${f.dt} → ${f.fieldname}`);
  }
  console.log();
}
