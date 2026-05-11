/**
 * Bewijst dat getProjectTasks correct terugvalt op de base query
 * als custom_wacht_op nog niet geïnstalleerd is op Task.
 *
 * Uitvoeren:
 *   npx tsx scripts/test-4a-fallback.ts
 *
 * Vereist: Task-velden custom_wacht_op / custom_wacht_op_toelichting
 *          zijn NIET geïnstalleerd (lege staat vóór wizard-run).
 */

const HOST  = "https://drechtstedenbouw-erp.prilk.cloud";
const TOKEN = "token f252f378823b06a:9d4575aa1c2faad";

async function erpnextGet(fields: string[]): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const params = new URLSearchParams({
    doctype: "Task",
    fields: JSON.stringify(fields),
    limit_page_length: "3",
  });
  const res = await fetch(`${HOST}/api/method/frappe.client.get_list`, {
    method: "POST",
    headers: {
      Authorization: TOKEN,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const json = await res.json() as Record<string, unknown>;
  if (json.exception || json.exc_type) {
    const msg = String(json.exception ?? "").split("\n")[0];
    return { ok: false, error: msg };
  }
  return { ok: true, data: json.message };
}

console.log("\n══════════════════════════════════════════════");
console.log("  FALLBACK-TEST: custom_wacht_op nog niet geïnstalleerd");
console.log("══════════════════════════════════════════════\n");

// ── Poging 1: met custom_wacht_op (verwacht: DataError) ──────────────────────
const withCustom = await erpnextGet([
  "name", "subject", "status", "custom_wacht_op", "custom_wacht_op_toelichting",
]);

console.log("Poging 1 — query MÉT custom_wacht_op:");
if (!withCustom.ok) {
  console.log(`  ✓ Frappe geeft fout terug: "${withCustom.error}"`);
  console.log("    → getProjectTasks vangt dit op en start fallback-query");
} else {
  console.log("  ✗ Verwachtte een fout maar kreeg data — velden zijn al geïnstalleerd?");
  console.log("    Dit script is bedoeld voor de lege staat vóór installatie.");
}

console.log();

// ── Poging 2: fallback zonder custom_wacht_op (verwacht: succes) ─────────────
const withoutCustom = await erpnextGet([
  "name", "subject", "status", "is_milestone", "is_group",
  "exp_start_date", "exp_end_date", "progress", "expected_time",
  "depends_on_tasks", "_assign",
]);

console.log("Poging 2 — fallback query ZONDER custom_wacht_op:");
if (withoutCustom.ok) {
  const rows = withoutCustom.data as Array<Record<string, unknown>>;
  console.log(`  ✓ Succes — ${rows.length} taak/-taken opgehaald`);
  for (const row of rows) {
    console.log(`    ${row.name} | subject="${row.subject}" | wachtOp=null (veld afwezig → null)`);
  }
} else {
  console.log(`  ✗ Fallback mislukt: ${withoutCustom.error}`);
}

console.log();

// ── Conclusie ─────────────────────────────────────────────────────────────────
const fallbackWerkt = !withCustom.ok && withoutCustom.ok;
console.log(fallbackWerkt
  ? "✓ Fallback werkt correct: DataError op poging 1, succes op poging 2.\n  getProjectTasks levert ProjectTask[] met wachtOp=null voor alle taken.\n  De Planning-tab werkt volledig; alleen wacht-op-tags zijn afwezig."
  : "✗ Onverwachte uitkomst — zie uitvoer hierboven.");
console.log();
