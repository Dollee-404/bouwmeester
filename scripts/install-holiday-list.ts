/**
 * 5B-uitbreiding — installeert NL-feestdagenlijst in ERPNext en koppelt
 * hem als default aan company "Drechtsteden Bouw B.V.".
 *
 * Feestdagenset: statische NL-set 2025-2027, identiek aan planning-helpers.ts.
 * Variabele feestdagen (Pasen, Hemelvaart, Pinksteren, Koningsdag) zijn
 * vooraf berekend inclusief verschuivingsregels.
 *
 * Idempotent: als de Holiday List al bestaat, wordt hij overgeslagen.
 * Company-koppeling wordt bij elke run opnieuw gezet (idempotent).
 *
 * Uitvoeren: npx tsx scripts/install-holiday-list.ts
 */

const HOST    = "https://drechtstedenbouw-erp.prilk.cloud";
const TOKEN   = "token f252f378823b06a:9d4575aa1c2faad";
const COMPANY = "Drechtsteden Bouw B.V.";
const LIST_NAME = "NL Feestdagen 2025-2027";

// Identiek aan NL_HOLIDAYS in planning-helpers.ts
const NL_HOLIDAYS = [
  // 2025
  { date: "2025-01-01", name: "Nieuwjaarsdag" },
  { date: "2025-04-18", name: "Goede Vrijdag" },
  { date: "2025-04-20", name: "Eerste Paasdag" },
  { date: "2025-04-21", name: "Tweede Paasdag" },
  { date: "2025-04-26", name: "Koningsdag" },        // 27 apr = zondag → 26 apr
  { date: "2025-05-05", name: "Bevrijdingsdag" },    // lustrum 2025
  { date: "2025-05-29", name: "Hemelvaartsdag" },
  { date: "2025-06-08", name: "Eerste Pinksterdag" },
  { date: "2025-06-09", name: "Tweede Pinksterdag" },
  { date: "2025-12-25", name: "Eerste Kerstdag" },
  { date: "2025-12-26", name: "Tweede Kerstdag" },
  // 2026
  { date: "2026-01-01", name: "Nieuwjaarsdag" },
  { date: "2026-04-03", name: "Goede Vrijdag" },
  { date: "2026-04-05", name: "Eerste Paasdag" },
  { date: "2026-04-06", name: "Tweede Paasdag" },
  { date: "2026-04-27", name: "Koningsdag" },
  { date: "2026-05-14", name: "Hemelvaartsdag" },
  { date: "2026-05-24", name: "Eerste Pinksterdag" },
  { date: "2026-05-25", name: "Tweede Pinksterdag" },
  { date: "2026-12-25", name: "Eerste Kerstdag" },
  { date: "2026-12-26", name: "Tweede Kerstdag" },
  // 2027
  { date: "2027-01-01", name: "Nieuwjaarsdag" },
  { date: "2027-03-26", name: "Goede Vrijdag" },
  { date: "2027-03-28", name: "Eerste Paasdag" },
  { date: "2027-03-29", name: "Tweede Paasdag" },
  { date: "2027-04-27", name: "Koningsdag" },
  { date: "2027-05-06", name: "Hemelvaartsdag" },
  { date: "2027-05-16", name: "Eerste Pinksterdag" },
  { date: "2027-05-17", name: "Tweede Pinksterdag" },
  { date: "2027-12-25", name: "Eerste Kerstdag" },
  { date: "2027-12-26", name: "Tweede Kerstdag" },
] as const;

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

console.log("\n══════════════════════════════════════════════");
console.log("  5B — INSTALLATIE NL HOLIDAY LIST");
console.log("══════════════════════════════════════════════\n");

// 1. Controleer of de lijst al bestaat
const existing = await apiFetch("frappe.client.get_list", {
  doctype: "Holiday List",
  fields: JSON.stringify(["name"]),
  filters: JSON.stringify([["name", "=", LIST_NAME]]),
  limit_page_length: 1,
});
const existingRows = existing.message as Array<{ name: string }> ?? [];

if (existingRows.length > 0) {
  console.log(`[skip] Holiday List "${LIST_NAME}" bestaat al.\n`);
} else {
  // 2. Aanmaken met alle feestdagen als child-table
  process.stdout.write(`Holiday List "${LIST_NAME}" aanmaken (${NL_HOLIDAYS.length} feestdagen) ... `);
  const insertResult = await apiFetch("frappe.client.insert", {
    doc: JSON.stringify({
      doctype: "Holiday List",
      holiday_list_name: LIST_NAME,
      from_date: "2025-01-01",
      to_date: "2027-12-31",
      holidays: NL_HOLIDAYS.map((h) => ({
        holiday_date: h.date,
        description: h.name,
        weekly_off: 0,
      })),
    }),
  });

  if (insertResult.exception || insertResult.exc_type) {
    console.log(`✗\n\nFout:\n${insertResult.exception ?? insertResult.exc_type}`);
    process.exit(1);
  }
  console.log("✓");
}

// 3. Koppelen aan company als default
process.stdout.write(`Company "${COMPANY}" → default_holiday_list koppelen ... `);
const setResult = await apiFetch("frappe.client.set_value", {
  doctype: "Company",
  name: COMPANY,
  fieldname: "default_holiday_list",
  value: LIST_NAME,
});

if (setResult.exception || setResult.exc_type) {
  console.log(`✗\n\nFout:\n${setResult.exception ?? setResult.exc_type}`);
} else {
  console.log("✓");
}

// 4. Hercontrole
console.log("\n══════════════════════════════════════════════");
console.log("  HERCONTROLE");
console.log("══════════════════════════════════════════════\n");

const company = await apiFetch("frappe.client.get", {
  doctype: "Company",
  name: COMPANY,
});
const companyDoc = company.message as Record<string, unknown>;
const linked = companyDoc.default_holiday_list as string | null;

console.log(`default_holiday_list: ${linked ?? "(leeg)"}`);
console.log(`\n${linked === LIST_NAME ? "✓ Holiday List correct ingesteld." : "✗ Koppeling niet bevestigd."}\n`);
