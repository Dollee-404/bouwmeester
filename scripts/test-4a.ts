/**
 * Fase 4A — console-demo
 *
 * Uitvoeren:
 *   npx tsx scripts/test-4a.ts
 *
 * Toont:
 *  1. Werkbare-dagen-helper: normaal / Koningsdag / weekend-overlapscenario
 *  2. Kritieke-pad-berekening: parallel A+B → C → D
 */

import {
  countWorkingDays,
  getHolidaysInRange,
  computeCriticalPath,
  parseDependsOn,
  parseAssign,
  parseTaskDate,
  type CriticalPathTask,
} from "../src/data/planning-helpers.ts";

const DAYS = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function fmt(d: Date): string {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function check(label: string, got: number, expected: number): void {
  const ok = got === expected;
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  console.log(`    Berekend: ${got}   Verwacht: ${expected}${ok ? "" : "  ← FOUT"}`);
}

// ════════════════════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  1. WERKBARE-DAGEN HELPER");
console.log("══════════════════════════════════════════════\n");

// Test A — gewone werkweek, geen feestdag, geen weekend
{
  const start = new Date("2026-04-20"); // ma
  const end   = new Date("2026-04-24"); // vr
  const holidays = getHolidaysInRange(start, end);
  console.log(`Test A: gewone werkweek (${fmt(start)} – ${fmt(end)})`);
  console.log(`  Feestdagen in periode: ${holidays.length === 0 ? "geen" : holidays.join(", ")}`);
  check("5 werkbare dagen", countWorkingDays(start, end), 5);
}

console.log();

// Test B — periode MÉT Koningsdag (ma 27 apr 2026)
{
  const start = new Date("2026-04-27"); // ma Koningsdag
  const end   = new Date("2026-05-01"); // vr
  const holidays = getHolidaysInRange(start, end);
  console.log(`Test B: periode met Koningsdag (${fmt(start)} – ${fmt(end)})`);
  console.log(`  Feestdagen in periode: ${holidays.map((h) => {
    const d = new Date(h);
    return `${fmt(d)} (feestdag)`;
  }).join(", ")}`);
  console.log("  Verwachting: 4 werkbare dagen (ma 27 apr overgeslagen als Koningsdag)");
  check("4 werkbare dagen", countWorkingDays(start, end), 4);
}

console.log();

// Test C — periode over weekend + Koningsdag
{
  const start = new Date("2026-04-23"); // do
  const end   = new Date("2026-04-29"); // wo
  const holidays = getHolidaysInRange(start, end);
  console.log(`Test C: periode over weekend + Koningsdag (${fmt(start)} – ${fmt(end)})`);
  console.log(`  Feestdagen in periode: ${holidays.map((h) => {
    const d = new Date(h);
    return `${fmt(d)}`;
  }).join(", ")}`);
  console.log("  Niet-werkbare dagen: za 25, zo 26 (weekend) + ma 27 (Koningsdag)");
  console.log("  Werkbare dagen: do 23, vr 24, di 28, wo 29 = 4 dagen");
  check("4 werkbare dagen", countWorkingDays(start, end), 4);
}

console.log();

// Test D — startDate na endDate (randgeval)
{
  const start = new Date("2026-05-10");
  const end   = new Date("2026-05-01");
  console.log(`Test D: endDate vóór startDate (${fmt(start)} – ${fmt(end)})`);
  check("0 werkbare dagen", countWorkingDays(start, end), 0);
}

// ════════════════════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  2. KRITIEKE-PAD-BEREKENING");
console.log("══════════════════════════════════════════════\n");

console.log("Scenario: A en B parallel, beide → C → D\n");

const tasks: CriticalPathTask[] = [
  { id: "A", duration: 5, dependsOn: [] },
  { id: "B", duration: 3, dependsOn: [] },
  { id: "C", duration: 4, dependsOn: ["A", "B"] },
  { id: "D", duration: 2, dependsOn: ["C"] },
];

console.log("Invoer:");
for (const t of tasks) {
  const deps = t.dependsOn.length === 0 ? "(geen)" : t.dependsOn.join(", ");
  console.log(`  Taak ${t.id}: duur=${t.duration}d  afhankelijk van: ${deps}`);
}

console.log("\nForward pass (vroegste start/einde):");
const result = computeCriticalPath(tasks);
for (const t of tasks) {
  const r = result.tasks.get(t.id)!;
  console.log(`  Taak ${t.id}: ES=${r.earlyStart}  EF=${r.earlyFinish}`);
}

console.log("\nBackward pass (laatste start/einde):");
for (const t of tasks) {
  const r = result.tasks.get(t.id)!;
  console.log(`  Taak ${t.id}: LS=${r.lateStart}  LF=${r.lateFinish}`);
}

console.log("\nFloat (speling) en kritiek-markering:");
for (const t of tasks) {
  const r = result.tasks.get(t.id)!;
  const tag = r.isCritical ? "KRITIEK" : `niet-kritiek (${r.float}d speling)`;
  console.log(`  Taak ${t.id}: float=${r.float}d  → ${tag}`);
}

console.log(`\nKritiek pad: ${result.criticalPath.join(" → ")}`);
console.log(`Projectduur: ${result.projectDuration} werkbare dagen`);

// Verificatie: verwacht pad is A → C → D, B heeft 2d speling
const expectedCritical = new Set(["A", "C", "D"]);
const gotCritical = new Set(result.criticalPath);
const pathOk = ["A", "C", "D"].every((id) => gotCritical.has(id)) && !gotCritical.has("B");
const floatBOk = result.tasks.get("B")!.float === 2;
const durationOk = result.projectDuration === 11;

console.log("\nVerificatie:");
console.log(`  ${pathOk      ? "✓" : "✗"} Kritiek pad is A → C → D (B is niet-kritiek)`);
console.log(`  ${floatBOk    ? "✓" : "✗"} Taak B heeft 2 dagen speling`);
console.log(`  ${durationOk  ? "✓" : "✗"} Projectduur is 11 werkbare dagen`);

const allOk = pathOk && floatBOk && durationOk;
console.log(`\n${allOk ? "✓ Alle checks geslaagd." : "✗ Eén of meer checks mislukt."}`);

// ════════════════════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  3. CONVERSIE VAN RUWE ERPNEXT-TASKDATA");
console.log("══════════════════════════════════════════════\n");

console.log("Synthetische raw ERPNext-rij (zoals de bridge hem aanlevert):\n");

const rawTask = {
  name: "TASK-2026-00042",
  subject: "Ruwbouw fundering",
  // depends_on_tasks: komma-gescheiden string, inclusief spaties rondom komma's
  // en een entry met een spatie erin (edge case: Frappe trim verwacht)
  depends_on_tasks: "TASK-2026-00010, TASK-2026-00011 , TASK-2026-00012",
  // _assign: JSON-array-string met twee users
  _assign: '["j.de.vries@drechtstedenbouw.nl", "r.dekker@drechtstedenbouw.nl"]',
  // Datum als ISO-string (zoals ERPNext ze levert)
  exp_start_date: "2026-05-11",
  exp_end_date: "2026-06-30",
  // Ontbrekende velden (testen dat parsing niet crasht)
  custom_wacht_op: null,
  custom_wacht_op_toelichting: null,
};

console.log(`  depends_on_tasks  : "${rawTask.depends_on_tasks}"`);
console.log(`  _assign           : ${rawTask._assign}`);
console.log(`  exp_start_date    : "${rawTask.exp_start_date}"`);
console.log(`  custom_wacht_op   : ${rawTask.custom_wacht_op}`);

console.log("\nNa parsing (productiefuncties uit planning-helpers.ts):\n");

const parsedDeps   = parseDependsOn(rawTask.depends_on_tasks);
const parsedAssign = parseAssign(rawTask._assign);
const parsedStart  = parseTaskDate(rawTask.exp_start_date);
const parsedEnd    = parseTaskDate(rawTask.exp_end_date);
const parsedWacht  = rawTask.custom_wacht_op ?? null;

console.log(`  dependsOn         : [${parsedDeps.map((s) => `"${s}"`).join(", ")}]`);
console.log(`  assignedTo        : [${parsedAssign.map((s) => `"${s}"`).join(", ")}]`);
console.log(`  expectedStartDate : ${parsedStart ? fmt(parsedStart) : "null"}`);
console.log(`  expectedEndDate   : ${parsedEnd ? fmt(parsedEnd) : "null"}`);
console.log(`  wachtOp           : ${parsedWacht ?? "null"}`);

console.log("\nVerificatie:");

function checkParse(label: string, ok: boolean, detail: string): void {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${ok ? "" : `  ← FOUT: ${detail}`}`);
}

checkParse(
  "3 afhankelijkheden geparsed (incl. spaties getrimd)",
  parsedDeps.length === 3 &&
    parsedDeps[0] === "TASK-2026-00010" &&
    parsedDeps[1] === "TASK-2026-00011" &&
    parsedDeps[2] === "TASK-2026-00012",
  `got: [${parsedDeps.join(", ")}]`,
);

checkParse(
  "Geen lege segmenten in dependsOn",
  parsedDeps.every((s) => s.length > 0),
  `got: [${parsedDeps.join(", ")}]`,
);

checkParse(
  "2 gebruikers geparsed uit _assign JSON",
  parsedAssign.length === 2 &&
    parsedAssign[0] === "j.de.vries@drechtstedenbouw.nl" &&
    parsedAssign[1] === "r.dekker@drechtstedenbouw.nl",
  `got: [${parsedAssign.join(", ")}]`,
);

checkParse(
  "exp_start_date geparsed als Date",
  parsedStart instanceof Date && parsedStart.getFullYear() === 2026 && parsedStart.getMonth() === 4,
  `got: ${parsedStart}`,
);

checkParse(
  "null custom_wacht_op geeft null (geen crash)",
  parsedWacht === null,
  `got: ${parsedWacht}`,
);

// Edge cases: lege / kapotte invoer
const emptyDeps  = parseDependsOn(null);
const emptyDeps2 = parseDependsOn("");
const badAssign  = parseAssign("geen-json");
const badDate    = parseTaskDate("geen-datum");

checkParse("parseDependsOn(null) → []",    emptyDeps.length === 0,  `got: ${JSON.stringify(emptyDeps)}`);
checkParse('parseDependsOn("") → []',      emptyDeps2.length === 0, `got: ${JSON.stringify(emptyDeps2)}`);
checkParse('parseAssign("geen-json") → []', badAssign.length === 0,  `got: ${JSON.stringify(badAssign)}`);
checkParse('parseTaskDate("geen-datum") → null', badDate === null,   `got: ${badDate}`);

const parseAllOk = parsedDeps.length === 3 && parsedAssign.length === 2 &&
  parsedStart instanceof Date && parsedWacht === null &&
  emptyDeps.length === 0 && badAssign.length === 0 && badDate === null;
console.log(`\n${parseAllOk ? "✓ Alle conversie-checks geslaagd." : "✗ Eén of meer conversie-checks mislukt."}\n`);
