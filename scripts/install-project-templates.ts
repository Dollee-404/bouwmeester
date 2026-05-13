/**
 * 5B — installeert zes Bouwmeester Project Templates in ERPNext.
 *
 * Werkwijze:
 *   1. Per fase-Task: zoek op subject + is_template=1. Aanmaken als ontbreekt.
 *   2. Per Project Template: check op naam. Aanmaken als ontbreekt.
 *
 * Idempotent: her-draaien doet geen schade.
 * Uitvoeren: npx tsx scripts/install-project-templates.ts
 *
 * Plan-B: als insert op Project Template of Task geblokkeerd wordt door
 * permissies, staat dat hieronder gelogd als known limitation. Templates
 * kunnen dan handmatig worden aangemaakt via ERPNext UI (Project → Templates).
 */

const HOST  = "https://drechtstedenbouw-erp.prilk.cloud";
const TOKEN = "token f252f378823b06a:9d4575aa1c2faad";

// ── Fase-definitie per werksoort ──────────────────────────────────────────────
// start = offset in werkdagen vanaf project-startdatum
// duration = doorlooptijd in werkdagen (richtlijn, aanpasbaar per project)

interface FaseDef {
  subject: string;
  start: number;
  duration: number;
}

interface TemplateDef {
  name: string;
  fases: readonly FaseDef[];
}

const TEMPLATES: readonly TemplateDef[] = [
  {
    name: "Nieuwbouw",
    fases: [
      { subject: "Fundering & Grondwerk",  start: 0,   duration: 20 },
      { subject: "Ruwbouw & Constructie",  start: 20,  duration: 40 },
      { subject: "Installaties",           start: 60,  duration: 20 },
      { subject: "Afwerking",              start: 80,  duration: 30 },
      { subject: "Buitenterrein",          start: 110, duration: 15 },
    ],
  },
  {
    name: "Renovatie",
    fases: [
      { subject: "Sloop",        start: 0,  duration: 10 },
      { subject: "Constructie",  start: 10, duration: 20 },
      { subject: "Installaties", start: 30, duration: 15 },
      { subject: "Afbouw",       start: 45, duration: 20 },
      { subject: "Oplevering",   start: 65, duration: 5  },
    ],
  },
  {
    name: "Verbouw",
    fases: [
      { subject: "Opname",        start: 0,  duration: 3  },
      { subject: "Voorbereiding", start: 3,  duration: 7  },
      { subject: "Ruwbouw",       start: 10, duration: 15 },
      { subject: "Afbouw",        start: 25, duration: 20 },
      { subject: "Oplevering",    start: 45, duration: 5  },
    ],
  },
  {
    name: "Sloop",
    fases: [
      { subject: "Inventarisatie",      start: 0,  duration: 5  },
      { subject: "Sloop",               start: 5,  duration: 15 },
      { subject: "Afvoer & Verwerking", start: 20, duration: 10 },
    ],
  },
  {
    name: "Sanering",
    fases: [
      { subject: "Onderzoek",              start: 0,  duration: 10 },
      { subject: "Sanering",               start: 10, duration: 20 },
      { subject: "Vrijgave & Rapportage",  start: 30, duration: 5  },
    ],
  },
  {
    name: "Keukenbladen",
    fases: [
      { subject: "Order",               start: 0,  duration: 2  },
      { subject: "Inmeten",             start: 2,  duration: 1  },
      { subject: "Tekenen",             start: 3,  duration: 3  },
      { subject: "Productie",           start: 6,  duration: 10 },
      { subject: "Levering & Montage",  start: 16, duration: 2  },
      { subject: "Service",             start: 18, duration: 5  },
    ],
  },
  {
    name: "Onderhoud",
    fases: [
      { subject: "Aanvraag",    start: 0,  duration: 3  },
      { subject: "Inspectie",   start: 3,  duration: 3  },
      { subject: "Uitvoering",  start: 6,  duration: 10 },
      { subject: "Oplevering",  start: 16, duration: 3  },
    ],
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch(method: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
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
  return res.json() as Promise<Record<string, unknown>>;
}

function taskSubject(_templateName: string, fase: string): string {
  return fase;
}

// Zoek een bestaand template-Task op subject. Geeft de Frappe-naam terug of null.
async function findTemplateTask(subject: string): Promise<string | null> {
  const result = await apiFetch("frappe.client.get_list", {
    doctype: "Task",
    fields: JSON.stringify(["name"]),
    filters: JSON.stringify([["is_template", "=", 1], ["subject", "=", subject]]),
    limit_page_length: 1,
  });
  const rows = result.message as Array<{ name: string }> | undefined;
  return rows && rows.length > 0 ? rows[0].name : null;
}

// Maak een template-Task aan en geef de Frappe-naam terug.
async function createTemplateTask(subject: string, start: number, duration: number): Promise<string> {
  const result = await apiFetch("frappe.client.insert", {
    doc: JSON.stringify({
      doctype: "Task",
      subject,
      is_template: 1,
      is_group: 1,
      start,
      duration,
    }),
  });
  const doc = result.message as Record<string, unknown>;
  if (result.exception || result.exc_type) {
    throw new Error(String(result.exception ?? result.exc_type));
  }
  return doc.name as string;
}

// Controleer of een Project Template al bestaat.
async function templateExists(name: string): Promise<boolean> {
  const result = await apiFetch("frappe.client.get_list", {
    doctype: "Project Template",
    fields: JSON.stringify(["name"]),
    filters: JSON.stringify([["name", "=", name]]),
    limit_page_length: 1,
  });
  const rows = result.message as Array<{ name: string }> | undefined;
  return !!rows && rows.length > 0;
}

async function createProjectTemplate(name: string, taskNames: string[]): Promise<void> {
  const result = await apiFetch("frappe.client.insert", {
    doc: JSON.stringify({
      doctype: "Project Template",
      name,
      tasks: taskNames.map((task) => ({ task })),
    }),
  });
  if (result.exception || result.exc_type) {
    throw new Error(String(result.exception ?? result.exc_type));
  }
}

// ── Uitvoering ────────────────────────────────────────────────────────────────

console.log("\n══════════════════════════════════════════════");
console.log("  5B — INSTALLATIE PROJECT TEMPLATES");
console.log("══════════════════════════════════════════════\n");

let totalTemplatesCreated = 0;
let totalTasksCreated = 0;
let totalSkipped = 0;
const knownLimitations: string[] = [];

for (const template of TEMPLATES) {
  console.log(`── ${template.name} (${template.fases.length} fases) ──`);

  // 1. Controleer of het template al bestaat
  const exists = await templateExists(template.name);
  if (exists) {
    console.log(`  [skip] Project Template "${template.name}" bestaat al.\n`);
    totalSkipped++;
    continue;
  }

  // 2. Zorg dat alle fase-Tasks bestaan
  const taskNames: string[] = [];
  for (const fase of template.fases) {
    const subject = taskSubject(template.name, fase.subject);
    process.stdout.write(`  fase "${fase.subject}" ... `);

    const existing = await findTemplateTask(subject);
    if (existing) {
      console.log(`[skip] Task "${existing}" al aanwezig`);
      taskNames.push(existing);
    } else {
      try {
        const taskName = await createTemplateTask(subject, fase.start, fase.duration);
        console.log(`✓ Task "${taskName}" aangemaakt`);
        taskNames.push(taskName);
        totalTasksCreated++;
      } catch (e) {
        const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
        console.log(`✗ mislukt: ${msg}`);
        knownLimitations.push(`Task "${subject}": ${msg}`);
        // Stop met dit template — kan niet verder zonder alle tasks
        taskNames.length = 0;
        break;
      }
    }
  }

  if (taskNames.length !== template.fases.length) {
    console.log(`  ✗ Template "${template.name}" overgeslagen (niet alle tasks aangemaakt).\n`);
    continue;
  }

  // 3. Maak het Project Template aan
  process.stdout.write(`  Project Template "${template.name}" aanmaken ... `);
  try {
    await createProjectTemplate(template.name, taskNames);
    console.log("✓");
    totalTemplatesCreated++;
  } catch (e) {
    const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
    console.log(`✗ mislukt: ${msg}`);
    knownLimitations.push(`Project Template "${template.name}": ${msg}`);
  }

  console.log();
}

// ── Eindverslag ───────────────────────────────────────────────────────────────

console.log("══════════════════════════════════════════════");
console.log("  EINDVERSLAG");
console.log("══════════════════════════════════════════════\n");
console.log(`  Templates aangemaakt : ${totalTemplatesCreated}`);
console.log(`  Templates overgeslagen: ${totalSkipped}`);
console.log(`  Fase-Tasks aangemaakt: ${totalTasksCreated}`);

if (knownLimitations.length > 0) {
  console.log(`\n  Known limitations (manuele actie vereist in ERPNext UI):`);
  for (const lim of knownLimitations) {
    console.log(`    • ${lim}`);
  }
}

// ── Hercontrole: toon alle Project Templates ──────────────────────────────────

console.log("\n══════════════════════════════════════════════");
console.log("  HERCONTROLE — Project Templates in ERPNext");
console.log("══════════════════════════════════════════════\n");

const all = await apiFetch("frappe.client.get_list", {
  doctype: "Project Template",
  fields: JSON.stringify(["name"]),
  limit_page_length: 50,
});
const allRows = all.message as Array<{ name: string }> | undefined ?? [];

console.log("RAW RESPONSE get_list:");
console.log(JSON.stringify({ message: allRows }, null, 2));

console.log("\nBouwmeester-templates aanwezig:");
for (const tmpl of TEMPLATES) {
  const found = allRows.some((r) => r.name === tmpl.name);
  console.log(`  ${found ? "✓" : "✗"} ${tmpl.name}`);
}
console.log();
