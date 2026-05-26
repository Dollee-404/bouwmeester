# Calculatie Tab: ERPNext Offerte Viewer & Prijseditor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toon ERPNext-offertes (Quotation met `kbf_opname=1`) in de Calculatie-tab van het project-detailpaneel, inclusief inline prijsbewerking per offerteregel.

**Architecture:** Een nieuwe `calculatie/` map naast `planning/` volgt hetzelfde component-patroon. Offertes worden gekoppeld aan een project via `Quotation.party_name = project.customerName` (ERPNext Customer-docname is identiek aan de `customer`-waarde op Project). De service-interface krijgt twee nieuwe methodes: `getProjectQuotations(customerName)` en `updateQuotationItemRate(...)`. Rate-bewerkingen schrijven direct naar ERPNext via `updateDocument`; het volledige items-array wordt meegezonden om child-row overschrijving te voorkomen. Beschrijvingen zijn HTML (Text Editor-veld) en worden gestript voor display.

**Tech Stack:** TypeScript · React 19 · Tailwind CSS v4 · lucide-react · Vite (geen testframework — verificatie via `tsc --noEmit` + handmatige browsertest)

---

## ERPNext-koppeling — hoe offertes aan een project worden gelinkt

De koppeling loopt via de klant:

- `Project.customer` = Customer-docname (bijv. `"Gemeente Sliedrecht"`)
- `Quotation.party_name` = diezelfde Customer-docname
- Filter: `party_name = detail.customerName` AND `kbf_opname = 1`

**Aanname:** één klant heeft tegelijkertijd maximaal één actief keukenblad-project. Als een klant meerdere actieve projecten krijgt, is een extra `kbf_project`-koppelfield in ERPNext de juiste vervolgstap. Dit is bewust buiten scope van dit plan gehouden.

**Bewerkbaarheid:** Offertes staan in Draft (docstatus=0) zolang prijzen nog niet zijn ingevuld. Zodra een offerte wordt ingediend (docstatus=1), blokkeert ERPNext bewerkingen. Het plan gaat uit van Draft-status; voeg bij doorontwikkeling een guard toe voor ingediende offertes.

---

## Bestandskaart

| Bestand | Actie | Verantwoordelijkheid |
|---------|-------|---------------------|
| `src/data/detail-types.ts` | Wijzigen | Voeg `QuotationItem`, `ProjectQuotation` types toe |
| `src/data/project-detail-service.ts` | Wijzigen | Voeg `getProjectQuotations`, `updateQuotationItemRate` toe aan interface + proxy |
| `src/data/project-detail-service-erpnext.ts` | Wijzigen | ERPNext-implementatie van beide methodes |
| `src/data/project-detail-service-mock.ts` | Wijzigen | Mock-implementatie + voorbeelddata |
| `src/i18n/nl.json` | Wijzigen | Vertalingen voor calculatie-scherm |
| `src/components/detail/calculatie/QuotationItemsTable.tsx` | Aanmaken | Regelstabel met inline rate-bewerking |
| `src/components/detail/calculatie/QuotationCard.tsx` | Aanmaken | Één offerte: header (datum, inmeter) + tabel |
| `src/components/detail/calculatie/CalculatieTab.tsx` | Aanmaken | Hoofdcomponent, data-fetching, optimistic updates |
| `src/components/detail/DetailPanel.tsx` | Wijzigen | Render `<CalculatieTab>` bij `activeTab === "calculatie"` |

---

## Task 1: i18n — vertalingen

**Files:**
- Modify: `src/i18n/nl.json`

- [ ] **Stap 1: Voeg calculatie-sectie toe aan nl.json**

Zoek de `"tab"`-sectie (rond regel 134) en voeg daarna een nieuw blok toe:

```json
"calculatie": {
  "empty_title": "Geen offertes gevonden",
  "empty_body": "Er zijn nog geen keukenblad-offertes aangemaakt voor dit project.",
  "loading": "Offertes laden…",
  "error": "Offertes konden niet worden geladen.",
  "meetdatum": "Meetdatum",
  "inmeter": "Inmeter",
  "aangemaakt": "Aangemaakt op",
  "table": {
    "code": "Code",
    "omschrijving": "Omschrijving",
    "aantal": "Aantal",
    "prijs": "Prijs/eenheid",
    "totaal": "Totaal"
  },
  "save_error": "Opslaan mislukt. Probeer opnieuw."
}
```

- [ ] **Stap 2: Controleer compilatie**

```bash
cd /home/eelke/Documenten/Github/Y-App/bouwmeester && npx tsc --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 3: Commit**

```bash
git add src/i18n/nl.json
git commit -m "feat(calculatie): i18n vertalingen voor offerte-tab"
```

---

## Task 2: Types — QuotationItem en ProjectQuotation

**Files:**
- Modify: `src/data/detail-types.ts`

- [ ] **Stap 1: Voeg types toe onderaan detail-types.ts**

Voeg toe na de sluitende `}` van `CreatePhasesResult` (na regel 70):

```typescript
export interface QuotationItem {
  /** ERPNext child-row docname (bijv. "KBF-QTN-ITEM-0001"), nodig voor update */
  rowName: string;
  itemCode: string;
  itemName: string;
  /** Beschrijving — HTML gestript voor weergave */
  description: string;
  qty: number;
  uom: string;
  /** Prijs per eenheid — initieel 0, door kantoor in te vullen */
  rate: number;
  /** Berekend: qty * rate */
  amount: number;
}

export interface ProjectQuotation {
  /** ERPNext Quotation-docname (bijv. "QTN-0001") */
  name: string;
  customerName: string;
  transactionDate: Date;
  /** Datum van de opname (kbf_meetdatum) */
  meetdatum: Date | null;
  /** Naam van de inmeter/verkoper (kbf_inmeter) */
  inmeter: string | null;
  items: QuotationItem[];
}
```

- [ ] **Stap 2: Controleer compilatie**

```bash
npx tsc --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 3: Commit**

```bash
git add src/data/detail-types.ts
git commit -m "feat(calculatie): types QuotationItem + ProjectQuotation"
```

---

## Task 3: Service interface — nieuwe methodes + proxy

**Files:**
- Modify: `src/data/project-detail-service.ts`

- [ ] **Stap 1: Voeg QuotationItem en ProjectQuotation toe aan import**

Vervang de import-regel (rond regel 5) door:

```typescript
import type {
  ProjectDetail,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
  QuotationItem,
  ProjectQuotation,
} from "./detail-types";
```

- [ ] **Stap 2: Voeg methodes toe aan de interface**

Voeg toe na `createDefaultPhaseTasks` in de `ProjectDetailService`-interface:

```typescript
/** Haal alle keukenblad-offertes op voor de opgegeven klant. */
getProjectQuotations(customerName: string): Promise<ProjectQuotation[]>;
/**
 * Sla een nieuwe rate op voor één offerteregel in ERPNext.
 * allItems = volledige huidige regellijst (nodig voor child-table PUT).
 */
updateQuotationItemRate(
  quotationName: string,
  rowName: string,
  newRate: number,
  allItems: QuotationItem[],
): Promise<void>;
```

- [ ] **Stap 3: Voeg re-exports toe**

Voeg `QuotationItem` en `ProjectQuotation` toe aan het `export type`-blok:

```typescript
export type {
  ProjectDetail,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
  QuotationItem,
  ProjectQuotation,
};
```

- [ ] **Stap 4: Voeg proxy-methodes toe aan projectDetailService**

Voeg toe na `createDefaultPhaseTasks` in het service-object:

```typescript
getProjectQuotations: async (customerName) =>
  (await getService()).getProjectQuotations(customerName),
updateQuotationItemRate: async (quotationName, rowName, newRate, allItems) =>
  (await getService()).updateQuotationItemRate(quotationName, rowName, newRate, allItems),
```

- [ ] **Stap 5: Controleer compilatie**

```bash
npx tsc --noEmit
```

Verwacht: TypeScript klaagt dat de methodes niet zijn geïmplementeerd in de mock- en ERPNext-service. Dit is correct; gaan we in Task 4 en 5 oplossen.

- [ ] **Stap 6: Commit**

```bash
git add src/data/project-detail-service.ts
git commit -m "feat(calculatie): service interface + proxy voor offerte-methodes"
```

---

## Task 4: Mock-service — voorbeelddata voor lokale ontwikkeling

**Files:**
- Modify: `src/data/project-detail-service-mock.ts`

- [ ] **Stap 1: Voeg imports toe**

Pas de import-regel boven aan het bestand aan:

```typescript
import type {
  ProjectDetail,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
  QuotationItem,
  ProjectQuotation,
} from "./detail-types";
```

- [ ] **Stap 2: Voeg mock-quotationdata toe**

Voeg toe na de sluitende `}` van `MOCK_DETAILS` (na de mock-details-definitie):

```typescript
const MOCK_QUOTATIONS: Record<string, ProjectQuotation[]> = {
  "Gemeente Sliedrecht": [
    {
      name: "QTN-DEMO-001",
      customerName: "Gemeente Sliedrecht",
      transactionDate: new Date("2026-05-10"),
      meetdatum: new Date("2026-05-08"),
      inmeter: "J. de Vries",
      items: [
        {
          rowName: "row-001",
          itemCode: "COMPOSIET-BLAD-20MM",
          itemName: "Composiet 20mm — Silestone Blanco Zeus",
          description: "Materiaal: Wit / Mat / Composiet / 20mm\nAfmetingen: 2400×600mm\nRandafwerking: Voor: DV20",
          qty: 1.44,
          uom: "Square Meter",
          rate: 0,
          amount: 0,
        },
        {
          rowName: "row-002",
          itemCode: "TOESLAG-SPARING-ONDERBOUW",
          itemName: "Sparing onderbouw spoelbak",
          description: "Onderbouw / Blanco Steel 780×500mm",
          qty: 1,
          uom: "Nos",
          rate: 0,
          amount: 0,
        },
        {
          rowName: "row-003",
          itemCode: "TOESLAG-BOORGAT-KRAAN",
          itemName: "Boorgat kraan",
          description: "Kraan (1 boorgat)",
          qty: 1,
          uom: "Nos",
          rate: 0,
          amount: 0,
        },
        {
          rowName: "row-004",
          itemCode: "TOESLAG-RAND-DV20",
          itemName: "Randafwerking DV20",
          description: "Randafwerking DV20 — 2.400m",
          qty: 2.4,
          uom: "Meter",
          rate: 0,
          amount: 0,
        },
      ],
    },
  ],
};

// In-memory opslag van gewijzigde prijzen per sessie (mock only)
const mockRates: Record<string, number> = {};
```

- [ ] **Stap 3: Implementeer getProjectQuotations**

Voeg toe als methode na `createDefaultPhaseTasks` in het mock-service-object (voor de sluitende `}`):

```typescript
async getProjectQuotations(customerName: string): Promise<ProjectQuotation[]> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
  const quotes = MOCK_QUOTATIONS[customerName] ?? [];
  return quotes.map((q) => ({
    ...q,
    items: q.items.map((item) => {
      const rate = mockRates[`${q.name}:${item.rowName}`] ?? item.rate;
      return { ...item, rate, amount: rate * item.qty };
    }),
  }));
},
```

- [ ] **Stap 4: Implementeer updateQuotationItemRate**

Voeg toe direct na `getProjectQuotations`:

```typescript
async updateQuotationItemRate(
  quotationName: string,
  rowName: string,
  newRate: number,
): Promise<void> {
  await new Promise((r) => setTimeout(r, 300));
  mockRates[`${quotationName}:${rowName}`] = newRate;
},
```

- [ ] **Stap 5: Controleer compilatie**

```bash
npx tsc --noEmit
```

Verwacht: één TypeScript-fout overblijft — ERPNext-service implementeert de interface nog niet. Dat lossen we op in Task 5.

- [ ] **Stap 6: Commit**

```bash
git add src/data/project-detail-service-mock.ts
git commit -m "feat(calculatie): mock-data + mock-implementatie voor offerte-methodes"
```

---

## Task 5: ERPNext-service — offertes ophalen en opslaan

**Files:**
- Modify: `src/data/project-detail-service-erpnext.ts`

- [ ] **Stap 1: Voeg imports toe**

Pas de import bovenaan het bestand aan:

```typescript
import { fetchDocument, fetchList, callMethod, createDocument, updateDocument } from "../bridge";
```

Voeg `QuotationItem` en `ProjectQuotation` toe aan de type-import:

```typescript
import type {
  ProjectDetail,
  ProjectTeamMember,
  ProjectTask,
  TimesheetMap,
  ActivityItem,
  ProjectFinancials,
  CreatePhasesResult,
  QuotationItem,
  ProjectQuotation,
} from "./detail-types";
```

- [ ] **Stap 2: Voeg raw-type interfaces toe**

Voeg toe vlak vóór de `erpnextDetailService`-definitie (na de laatste bestaande `interface`-definitie):

```typescript
interface RawQuotationItem {
  name: string;           // child-row docname — nodig voor idempotente PUT
  item_code: string;
  item_name: string;
  description: string | null;   // Text Editor → kan HTML bevatten
  qty: number;
  uom: string;
  rate: number;
  amount: number;
}

interface RawQuotation {
  name: string;
  party_name: string;
  transaction_date: string;
  kbf_meetdatum: string | null;
  kbf_inmeter: string | null;
  items: RawQuotationItem[];
}
```

- [ ] **Stap 3: Voeg HTML-strip helper toe**

Voeg toe direct na de raw-type-interfaces:

```typescript
/** Strip HTML-tags uit Text Editor-beschrijvingen voor plain-text weergave. */
function stripHtml(html: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}
```

- [ ] **Stap 4: Implementeer getProjectQuotations**

Voeg toe als laatste methode vóór de sluitende `}` van `erpnextDetailService`:

```typescript
async getProjectQuotations(customerName: string): Promise<ProjectQuotation[]> {
  // Koppeling via klant: party_name = customerName (ERPNext Customer docname)
  // kbf_opname=1 filtert op keukenblad-opname-offertes
  const list = await fetchList<{ name: string }>("Quotation", {
    filters: [
      ["party_name", "=", customerName],
      ["kbf_opname", "=", 1],
    ],
    fields: ["name"],
    order_by: "transaction_date desc",
    limit_page_length: 50,
  });

  if (list.length === 0) return [];

  const docs = await Promise.all(
    list.map((q) => fetchDocument<RawQuotation>("Quotation", q.name)),
  );

  return docs.map((doc): ProjectQuotation => ({
    name: doc.name,
    customerName: doc.party_name,
    transactionDate: new Date(doc.transaction_date),
    meetdatum: doc.kbf_meetdatum ? new Date(doc.kbf_meetdatum) : null,
    inmeter: doc.kbf_inmeter ?? null,
    items: (doc.items ?? []).map((row): QuotationItem => ({
      rowName: row.name,
      itemCode: row.item_code,
      itemName: row.item_name,
      description: stripHtml(row.description),
      qty: row.qty,
      uom: row.uom,
      rate: row.rate,
      amount: row.amount,
    })),
  }));
},
```

- [ ] **Stap 5: Implementeer updateQuotationItemRate**

Voeg toe direct na `getProjectQuotations`:

```typescript
async updateQuotationItemRate(
  quotationName: string,
  rowName: string,
  newRate: number,
  allItems: QuotationItem[],
): Promise<void> {
  // Frappe vereist de volledige items-array voor child-table-updates.
  // Stuur alle rijen terug met hun rowName (= child-row docname) om
  // onbedoeld verwijderen of dupliceren van rijen te voorkomen.
  const updatedItems = allItems.map((item) => ({
    name: item.rowName,
    rate: item.rowName === rowName ? newRate : item.rate,
  }));
  await updateDocument("Quotation", quotationName, { items: updatedItems });
},
```

- [ ] **Stap 6: Controleer compilatie**

```bash
npx tsc --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 7: Commit**

```bash
git add src/data/project-detail-service-erpnext.ts
git commit -m "feat(calculatie): ERPNext implementatie voor getProjectQuotations + updateQuotationItemRate"
```

---

## Task 6: QuotationItemsTable — regelstabel met inline prijsbewerking

**Files:**
- Create: `src/components/detail/calculatie/QuotationItemsTable.tsx`

- [ ] **Stap 1: Maak de map aan**

```bash
mkdir -p src/components/detail/calculatie
```

- [ ] **Stap 2: Schrijf de component**

```typescript
// src/components/detail/calculatie/QuotationItemsTable.tsx
import { useState } from "react";
import { Check, X, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { QuotationItem } from "../../../data/detail-types";

interface QuotationItemsTableProps {
  quotationName: string;
  items: QuotationItem[];
  onSaveRate: (rowName: string, newRate: number) => Promise<void>;
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatQty(qty: number, uom: string): string {
  if (uom === "Square Meter") return `${qty.toFixed(3)} m²`;
  if (uom === "Meter") return `${qty.toFixed(2)} m`;
  return `${qty} st`;
}

export function QuotationItemsTable({ items, onSaveRate }: QuotationItemsTableProps) {
  const { t } = useTranslation();
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  function startEdit(item: QuotationItem) {
    setEditingRow(item.rowName);
    setEditValue(item.rate === 0 ? "" : String(item.rate).replace(".", ","));
    setSaveError(null);
  }

  function cancelEdit() {
    setEditingRow(null);
    setEditValue("");
    setSaveError(null);
  }

  async function commitEdit(item: QuotationItem) {
    const parsed = parseFloat(editValue.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) {
      setSaveError(t("calculatie.save_error"));
      return;
    }
    setSavingRow(item.rowName);
    setSaveError(null);
    try {
      await onSaveRate(item.rowName, parsed);
      setEditingRow(null);
    } catch {
      setSaveError(t("calculatie.save_error"));
    } finally {
      setSavingRow(null);
    }
  }

  const grandTotal = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
            <th className="pb-2 pr-4 w-36">{t("calculatie.table.code")}</th>
            <th className="pb-2 pr-4">{t("calculatie.table.omschrijving")}</th>
            <th className="pb-2 pr-4 text-right w-24">{t("calculatie.table.aantal")}</th>
            <th className="pb-2 pr-4 text-right w-28">{t("calculatie.table.prijs")}</th>
            <th className="pb-2 text-right w-28">{t("calculatie.table.totaal")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => {
            const isEditing = editingRow === item.rowName;
            const isSaving = savingRow === item.rowName;

            return (
              <tr key={item.rowName} className="group align-top">
                <td className="py-2.5 pr-4 text-xs text-slate-400 font-mono leading-relaxed">
                  {item.itemCode}
                </td>
                <td className="py-2.5 pr-4">
                  <div className="font-medium text-slate-700">{item.itemName}</div>
                  {item.description && (
                    <div className="mt-0.5 text-xs text-slate-400 whitespace-pre-line leading-snug">
                      {item.description}
                    </div>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-right text-slate-600 whitespace-nowrap">
                  {formatQty(item.qty, item.uom)}
                </td>
                <td className="py-2.5 pr-4 text-right">
                  {isEditing ? (
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-slate-400 text-xs">€</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(item);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                        className="w-20 text-right border border-y-teal rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-y-teal"
                        placeholder="0,00"
                      />
                      <button
                        onClick={() => commitEdit(item)}
                        disabled={isSaving}
                        className="p-0.5 text-y-teal hover:text-teal-700 disabled:opacity-40"
                        aria-label={t("calculatie.save_error")}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-40"
                        aria-label="Annuleer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(item)}
                      className="flex items-center justify-end gap-1.5 w-full text-right group/price"
                      aria-label={`Prijs bewerken voor ${item.itemName}`}
                    >
                      <span className={item.rate === 0 ? "text-slate-300" : "text-slate-700"}>
                        {formatEuro(item.rate)}
                      </span>
                      <Pencil
                        size={11}
                        className="text-slate-300 group-hover/price:text-y-teal opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-hidden
                      />
                    </button>
                  )}
                </td>
                <td className="py-2.5 text-right font-medium whitespace-nowrap">
                  {item.amount > 0 ? (
                    <span className="text-slate-700">{formatEuro(item.amount)}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        {items.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-slate-200">
              <td colSpan={4} className="pt-2.5 pr-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Totaal
              </td>
              <td className="pt-2.5 text-right font-semibold text-slate-800">
                {formatEuro(grandTotal)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
      {saveError && (
        <p className="mt-2 text-xs text-red-600">{saveError}</p>
      )}
    </div>
  );
}
```

- [ ] **Stap 3: Controleer compilatie**

```bash
npx tsc --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 4: Commit**

```bash
git add src/components/detail/calculatie/QuotationItemsTable.tsx
git commit -m "feat(calculatie): QuotationItemsTable met inline prijsbewerking"
```

---

## Task 7: QuotationCard — één offerte met header en regelstabel

**Files:**
- Create: `src/components/detail/calculatie/QuotationCard.tsx`

- [ ] **Stap 1: Schrijf de component**

```typescript
// src/components/detail/calculatie/QuotationCard.tsx
import { useTranslation } from "react-i18next";
import type { ProjectQuotation } from "../../../data/detail-types";
import { QuotationItemsTable } from "./QuotationItemsTable";

interface QuotationCardProps {
  quotation: ProjectQuotation;
  onSaveRate: (rowName: string, newRate: number) => Promise<void>;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function QuotationCard({ quotation, onSaveRate }: QuotationCardProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Header met meta-informatie */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center gap-x-6 gap-y-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-medium text-slate-500">
            {t("calculatie.aangemaakt")}
          </span>
          <span className="text-sm text-slate-700">
            {formatDate(quotation.transactionDate)}
          </span>
        </div>
        {quotation.meetdatum && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-medium text-slate-500">
              {t("calculatie.meetdatum")}
            </span>
            <span className="text-sm text-slate-700">
              {formatDate(quotation.meetdatum)}
            </span>
          </div>
        )}
        {quotation.inmeter && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-medium text-slate-500">
              {t("calculatie.inmeter")}
            </span>
            <span className="text-sm text-slate-700">{quotation.inmeter}</span>
          </div>
        )}
        <span className="ml-auto text-xs font-mono text-slate-400">
          {quotation.name}
        </span>
      </div>

      {/* Regelstabel */}
      <div className="px-4 py-4">
        <QuotationItemsTable
          quotationName={quotation.name}
          items={quotation.items}
          onSaveRate={onSaveRate}
        />
      </div>
    </div>
  );
}
```

- [ ] **Stap 2: Controleer compilatie**

```bash
npx tsc --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 3: Commit**

```bash
git add src/components/detail/calculatie/QuotationCard.tsx
git commit -m "feat(calculatie): QuotationCard component"
```

---

## Task 8: CalculatieTab — hoofdcomponent met data-fetching

**Files:**
- Create: `src/components/detail/calculatie/CalculatieTab.tsx`

- [ ] **Stap 1: Schrijf de component**

```typescript
// src/components/detail/calculatie/CalculatieTab.tsx
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { projectDetailService } from "../../../data/project-detail-service";
import type { ProjectQuotation, QuotationItem } from "../../../data/detail-types";
import { QuotationCard } from "./QuotationCard";

interface CalculatieTabProps {
  /** ERPNext Customer-docname, gelijk aan Project.customer */
  customerName: string;
}

export function CalculatieTab({ customerName }: CalculatieTabProps) {
  const { t } = useTranslation();
  const [quotations, setQuotations] = useState<ProjectQuotation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    projectDetailService
      .getProjectQuotations(customerName)
      .then((data) => {
        if (!cancelled) setQuotations(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[CalculatieTab] getProjectQuotations mislukt:", err);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [customerName]);

  const handleSaveRate = useCallback(
    async (quotationName: string, rowName: string, newRate: number) => {
      // Optimistic update: pas de UI direct aan vóór de server-call
      setQuotations((prev) =>
        prev
          ? prev.map((q) =>
              q.name !== quotationName
                ? q
                : {
                    ...q,
                    items: q.items.map((item): QuotationItem =>
                      item.rowName !== rowName
                        ? item
                        : { ...item, rate: newRate, amount: item.qty * newRate },
                    ),
                  },
            )
          : prev,
      );

      // Bepaal de volledige actuele regellijst voor de ERPNext PUT
      const quote = quotations?.find((q) => q.name === quotationName);
      if (!quote) return;

      const updatedItems = quote.items.map((item): QuotationItem =>
        item.rowName !== rowName
          ? item
          : { ...item, rate: newRate, amount: item.qty * newRate },
      );

      await projectDetailService.updateQuotationItemRate(
        quotationName,
        rowName,
        newRate,
        updatedItems,
      );
    },
    [quotations],
  );

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
        {t("calculatie.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-red-500">
        {t("calculatie.error")}
      </div>
    );
  }

  if (!quotations || quotations.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-medium text-slate-600">
          {t("calculatie.empty_title")}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {t("calculatie.empty_body")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {quotations.map((quotation) => (
        <QuotationCard
          key={quotation.name}
          quotation={quotation}
          onSaveRate={(rowName, newRate) =>
            handleSaveRate(quotation.name, rowName, newRate)
          }
        />
      ))}
    </div>
  );
}
```

- [ ] **Stap 2: Controleer compilatie**

```bash
npx tsc --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 3: Commit**

```bash
git add src/components/detail/calculatie/CalculatieTab.tsx
git commit -m "feat(calculatie): CalculatieTab met data-fetching en optimistic updates"
```

---

## Task 9: DetailPanel — calculatie-tab activeren

**Files:**
- Modify: `src/components/detail/DetailPanel.tsx`

- [ ] **Stap 1: Voeg import toe**

Voeg toe bij de bestaande imports (bij de `PlanningTab`-import, rond regel 15):

```typescript
import { CalculatieTab } from "./calculatie/CalculatieTab";
```

- [ ] **Stap 2: Voeg calculatie-case toe aan de tab-switch**

Zoek dit fragment (rond regel 225):

```typescript
{activeTab === "planning" ? (
  <PlanningTab
    detail={detail!}
    tasks={tasks ?? []}
    timesheets={timesheets ?? {}}
  />
) : activeTab === "overzicht" ? (
```

Vervang door:

```typescript
{activeTab === "planning" ? (
  <PlanningTab
    detail={detail!}
    tasks={tasks ?? []}
    timesheets={timesheets ?? {}}
  />
) : activeTab === "calculatie" ? (
  <CalculatieTab customerName={detail!.customerName} />
) : activeTab === "overzicht" ? (
```

- [ ] **Stap 3: Controleer compilatie**

```bash
npx tsc --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 4: Commit**

```bash
git add src/components/detail/DetailPanel.tsx
git commit -m "feat(calculatie): calculatie-tab ingeschakeld in DetailPanel"
```

---

## Task 10: Handmatige browserverificatie

*Geen testframework aanwezig — verificatie via dev-server.*

- [ ] **Stap 1: Start de dev-server**

```bash
npm run dev
```

Open `http://localhost:5173` in de browser.

- [ ] **Stap 2: Leeg project — lege staat**

Open een project waarvan de klant NIET `"Gemeente Sliedrecht"` is. Klik op de **Calculatie**-tab. Verwacht:
- Tab is klikbaar (niet langer grijs/uitgeschakeld)
- Tekst: "Geen offertes gevonden" + onderschrift

- [ ] **Stap 3: PROJ-0009 — offerte zichtbaar**

Open project `PROJ-0009` (Renovatie Gemeentehuis Sliedrecht, klant = "Gemeente Sliedrecht") en klik op **Calculatie**. Verwacht:
- Offertekaart QTN-DEMO-001 zichtbaar
- Header toont datum 10 mei 2026, meetdatum 8 mei 2026, inmeter J. de Vries
- 4 regelitems met prijs € 0,00 en totaalrij € 0,00

- [ ] **Stap 4: Inline prijsbewerking**

Hover over een prijscel → potlood-icoon verschijnt. Klik:
- Invoerveld opent, cursor actief
- Typ `125,50` → Enter: prijs toont € 125,50, totaal herberekent onmiddellijk
- Open een andere cel en druk Escape → bewerkingsmodus sluit zonder wijziging

- [ ] **Stap 5: Responsiviteit**

Verklein het browservenster naar mobilebreedte (<768px). Controleer dat de tabel horizontaal scrollt en de rest van het paneel normaal werkt.

- [ ] **Stap 6: Console-controle**

Geen rode fouten in de browser-console bij het navigeren door tabs.

- [ ] **Stap 7: Final commit**

```bash
git add -A
git commit -m "feat(calculatie): volledige offerte-tab — viewer + prijseditor gereed"
```

---

## Samenvatting

| Bestand | Type wijziging | Omvang |
|---------|---------------|--------|
| `src/i18n/nl.json` | +19 regels | Vertalingen |
| `src/data/detail-types.ts` | +20 regels | Nieuwe types |
| `src/data/project-detail-service.ts` | +12 regels | Interface + proxy |
| `src/data/project-detail-service-erpnext.ts` | +55 regels | ERPNext fetch + update |
| `src/data/project-detail-service-mock.ts` | +55 regels | Mock-data + implementatie |
| `src/components/detail/calculatie/QuotationItemsTable.tsx` | nieuw, ~120 regels | Tabel + inline editeer |
| `src/components/detail/calculatie/QuotationCard.tsx` | nieuw, ~50 regels | Offertekaart |
| `src/components/detail/calculatie/CalculatieTab.tsx` | nieuw, ~85 regels | Tab + data-fetching |
| `src/components/detail/DetailPanel.tsx` | +4 regels | Tab-switch |

**Totaal:** 9 bestanden, ~420 regels. Geen nieuwe dependencies.
