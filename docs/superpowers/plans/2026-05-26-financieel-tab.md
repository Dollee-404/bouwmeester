# Financieel-tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vervang de Financieel-tab placeholder door een facturenlijst die per Sales Invoice de status, het bedrag en de vervaldatum toont, voorafgegaan door een contractsamenvatting.

**Architecture:** `FinancieelTab` ontvangt de reeds-geladen `financials` (aanneemsom/meerwerk totalen) als prop van `DetailPanel` en haalt de individuele factuurregels zelf op via een nieuwe `getProjectInvoices` service-methode. Zo wordt `getProjectFinancials` niet dubbel aangeroepen. Patroon identiek aan `DocumentenTab` en `CalculatieTab`.

**Tech Stack:** React 19, TypeScript 5, Tailwind CSS 4, i18next, lucide-react. Verificatie via `npm run build`.

---

## Bestandsstructuur

| Bestand | Wijziging |
|---------|-----------|
| `src/data/detail-types.ts` | Voeg `InvoiceStatus` type + `SalesInvoice` interface toe |
| `src/data/project-detail-service.ts` | Voeg `getProjectInvoices` toe aan interface, exports en proxy |
| `src/data/project-detail-service-erpnext.ts` | Voeg `RawSalesInvoiceFull` + `getProjectInvoices` implementatie toe |
| `src/data/project-detail-service-mock.ts` | Voeg `MOCK_INVOICES` + `getProjectInvoices` implementatie toe |
| `src/components/detail/financieel/FinancieelTab.tsx` | Nieuw — contractsamenvatting + facturenlijst |
| `src/i18n/nl.json` | Voeg `financieel` sectie toe |
| `src/i18n/en.json` | Voeg `financieel` sectie toe |
| `src/components/detail/DetailPanel.tsx` | Import `FinancieelTab`, voeg `financieel`-case toe, geef `financials` door |

---

## Task 1: Service-laag — SalesInvoice type + getProjectInvoices in alle lagen

**Files:**
- Modify: `src/data/detail-types.ts`
- Modify: `src/data/project-detail-service.ts`
- Modify: `src/data/project-detail-service-erpnext.ts`
- Modify: `src/data/project-detail-service-mock.ts`

### Doel
Alle vier bestanden moeten tegelijk bijgewerkt worden — anders faalt de TypeScript-build.

- [ ] **Stap 1: Voeg `SalesInvoice` toe aan detail-types.ts**

Lees `src/data/detail-types.ts` volledig.

Voeg **aan het einde van het bestand** toe:

```typescript
export type InvoiceStatus = "Paid" | "Overdue" | "Unpaid" | "Partly Paid" | "Return";

export interface SalesInvoice {
  /** ERPNext Sales Invoice docname (bijv. "SINV-0001") */
  name: string;
  postingDate: Date;
  dueDate: Date | null;
  grandTotal: number;
  /** Nog niet betaald bedrag — 0 bij volledig betaalde factuur */
  outstandingAmount: number;
  status: InvoiceStatus;
}
```

- [ ] **Stap 2: Voeg `getProjectInvoices` toe aan project-detail-service.ts**

Lees `src/data/project-detail-service.ts` volledig.

**Stap 2a:** Voeg `SalesInvoice` toe aan de import uit `"./detail-types"` (zelfde bloc als `ProjectQuotation`, `ProjectFile`, etc.).

**Stap 2b:** Voeg de methode toe aan de `ProjectDetailService` interface, vóór `getProjectFiles` (of vóór `updateQuotationItemRate` als Plan C niet gedaan is):

```typescript
  /** Haal alle ingediende Sales Invoices op die aan dit project gekoppeld zijn. */
  getProjectInvoices(projectId: string): Promise<SalesInvoice[]>;
```

**Stap 2c:** Voeg `SalesInvoice` toe aan de `export type { ... }` re-exports.

**Stap 2d:** Voeg de proxy-methode toe aan het `projectDetailService` object, vóór `getProjectFiles` (of vóór `updateQuotationItemRate`):

```typescript
  getProjectInvoices: async (projectId) =>
    (await getService()).getProjectInvoices(projectId),
```

- [ ] **Stap 3: Voeg `getProjectInvoices` toe aan project-detail-service-erpnext.ts**

Lees `src/data/project-detail-service-erpnext.ts` regels 1–20 (imports) en regels 76–90 (bestaande `RawSalesInvoice`).

**Stap 3a:** Voeg `SalesInvoice` en `InvoiceStatus` toe aan de imports bovenaan.

**Stap 3b:** Voeg `RawSalesInvoiceFull` toe direct ná de bestaande `RawSalesInvoice` interface (regel ~83):

```typescript
interface RawSalesInvoiceFull {
  name: string;
  posting_date: string;
  due_date: string | null;
  grand_total: number;
  outstanding_amount: number;
  status: string;
}
```

**Stap 3c:** Voeg `getProjectInvoices` toe aan het `erpnextDetailService` object, vóór `getProjectFiles` (of vóór `updateQuotationItemRate`):

```typescript
  async getProjectInvoices(projectId: string): Promise<SalesInvoice[]> {
    const VALID: Set<InvoiceStatus> = new Set([
      "Paid", "Overdue", "Unpaid", "Partly Paid", "Return",
    ]);

    const invoices = await fetchList<RawSalesInvoiceFull>("Sales Invoice", {
      filters: [
        ["project", "=", projectId],
        ["docstatus", "=", 1],
      ],
      fields: ["name", "posting_date", "due_date", "grand_total", "outstanding_amount", "status"],
      order_by: "posting_date desc",
      limit_page_length: 100,
    });

    return invoices.map((inv): SalesInvoice => ({
      name: inv.name,
      postingDate: new Date(inv.posting_date),
      dueDate: inv.due_date ? new Date(inv.due_date) : null,
      grandTotal: inv.grand_total,
      outstandingAmount: inv.outstanding_amount,
      status: VALID.has(inv.status as InvoiceStatus)
        ? (inv.status as InvoiceStatus)
        : "Unpaid",
    }));
  },

```

- [ ] **Stap 4: Voeg `getProjectInvoices` toe aan project-detail-service-mock.ts**

Lees de imports en de laatste 30 regels van `src/data/project-detail-service-mock.ts`.

**Stap 4a:** Voeg `SalesInvoice` toe aan de imports.

**Stap 4b:** Voeg `MOCK_INVOICES` toe direct vóór `export const mockDetailService`:

```typescript
const MOCK_INVOICES: Record<string, SalesInvoice[]> = {
  "PROJ-0009": [
    {
      name: "SINV-2026-00012",
      postingDate: new Date("2026-02-28"),
      dueDate: new Date("2026-03-28"),
      grandTotal: 287_500,
      outstandingAmount: 0,
      status: "Paid",
    },
    {
      name: "SINV-2026-00031",
      postingDate: new Date("2026-04-30"),
      dueDate: new Date("2026-05-30"),
      grandTotal: 149_500,
      outstandingAmount: 149_500,
      status: "Overdue",
    },
  ],
};
```

**Stap 4c:** Voeg `getProjectInvoices` toe aan `mockDetailService`, vóór `getProjectFiles` (of vóór `updateQuotationItemRate`):

```typescript
  async getProjectInvoices(projectId: string): Promise<SalesInvoice[]> {
    await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
    return MOCK_INVOICES[projectId] ?? [];
  },

```

- [ ] **Stap 5: Controleer dat de build slaagt**

```bash
cd /home/eelke/Documenten/Github/Y-App/bouwmeester
npm run build
```

Verwacht: `✓ built in ...ms` — geen TypeScript-fouten.

- [ ] **Stap 6: Commit**

```bash
git add src/data/detail-types.ts \
        src/data/project-detail-service.ts \
        src/data/project-detail-service-erpnext.ts \
        src/data/project-detail-service-mock.ts
git commit -m "financieel-tab: SalesInvoice type + getProjectInvoices service-methode"
```

---

## Task 2: FinancieelTab component + i18n

**Files:**
- Create: `src/components/detail/financieel/FinancieelTab.tsx`
- Modify: `src/i18n/nl.json`
- Modify: `src/i18n/en.json`

- [ ] **Stap 1: Voeg i18n-strings toe aan nl.json**

Lees `src/i18n/nl.json`. Voeg **vóór** de allerlaatste `}` in:

```json
  ,
  "financieel": {
    "title_facturen": "Facturen",
    "loading": "Facturen laden…",
    "error": "Facturen konden niet worden geladen.",
    "empty_title": "Geen facturen gevonden",
    "empty_body": "Er zijn nog geen facturen aangemaakt voor dit project in ERPNext.",
    "status_paid": "Betaald",
    "status_overdue": "Vervallen",
    "status_unpaid": "Openstaand",
    "status_partly_paid": "Gedeeltelijk",
    "status_return": "Creditnota",
    "col_factuur": "Factuur",
    "col_datum": "Datum",
    "col_vervaldatum": "Vervaldatum",
    "col_bedrag": "Bedrag",
    "col_openstaand": "Openstaand"
  }
```

- [ ] **Stap 2: Voeg i18n-strings toe aan en.json**

Lees `src/i18n/en.json`. Voeg **vóór** de allerlaatste `}` in:

```json
  ,
  "financieel": {
    "title_facturen": "Invoices",
    "loading": "Loading invoices…",
    "error": "Failed to load invoices.",
    "empty_title": "No invoices found",
    "empty_body": "No invoices have been created for this project in ERPNext yet.",
    "status_paid": "Paid",
    "status_overdue": "Overdue",
    "status_unpaid": "Unpaid",
    "status_partly_paid": "Partial",
    "status_return": "Credit note",
    "col_factuur": "Invoice",
    "col_datum": "Date",
    "col_vervaldatum": "Due date",
    "col_bedrag": "Amount",
    "col_openstaand": "Outstanding"
  }
```

- [ ] **Stap 3: Controleer dat de JSON valide is**

```bash
node -e "require('./src/i18n/nl.json'); require('./src/i18n/en.json'); console.log('JSON OK')"
```

Verwacht: `JSON OK`

- [ ] **Stap 4: Maak de directory aan en schrijf FinancieelTab.tsx**

```bash
mkdir -p /home/eelke/Documenten/Github/Y-App/bouwmeester/src/components/detail/financieel
```

Schrijf `src/components/detail/financieel/FinancieelTab.tsx`:

```typescript
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { projectDetailService } from "../../../data/project-detail-service";
import type { ProjectFinancials, SalesInvoice, InvoiceStatus } from "../../../data/detail-types";
import { fmtEuro } from "../kpi-helpers";

// ── Status badge ──────────────────────────────────────────────────────

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; text: string; labelKey: string }> = {
  Paid:           { bg: "bg-green-50",  text: "text-green-700",  labelKey: "financieel.status_paid" },
  Overdue:        { bg: "bg-red-50",    text: "text-red-700",    labelKey: "financieel.status_overdue" },
  Unpaid:         { bg: "bg-amber-50",  text: "text-amber-700",  labelKey: "financieel.status_unpaid" },
  "Partly Paid":  { bg: "bg-amber-50",  text: "text-amber-700",  labelKey: "financieel.status_partly_paid" },
  Return:         { bg: "bg-slate-100", text: "text-slate-600",  labelKey: "financieel.status_return" },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { t } = useTranslation();
  const { bg, text, labelKey } = STATUS_STYLE[status];
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}>
      {t(labelKey)}
    </span>
  );
}

// ── Contractsamenvatting ──────────────────────────────────────────────

function MetricCell({ label, value, valueColor = "text-slate-800" }: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-base font-semibold tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}

function ContractSamenvatting({ financials }: { financials: ProjectFinancials }) {
  const { t } = useTranslation();
  const openstaandColor = financials.openstaand < 0 ? "text-amber-600" : "text-slate-800";
  const openstaandFmt = financials.openstaand < 0
    ? `−${fmtEuro(Math.abs(financials.openstaand))}`
    : fmtEuro(financials.openstaand);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <MetricCell label={t("sidebar.contract_aanneemsom")} value={fmtEuro(financials.aanneemsom)} />
      <MetricCell
        label={t("sidebar.contract_meerwerk")}
        value={financials.meerwerk === 0 ? "—" : fmtEuro(financials.meerwerk)}
      />
      <MetricCell label={t("sidebar.contract_gefactureerd")} value={fmtEuro(financials.gefactureerd)} />
      <MetricCell
        label={t("sidebar.contract_openstaand")}
        value={openstaandFmt}
        valueColor={openstaandColor}
      />
    </div>
  );
}

// ── Factuurlijst ──────────────────────────────────────────────────────

function InvoiceRow({ invoice }: { invoice: SalesInvoice }) {
  const { t } = useTranslation();
  const fmtDate = (d: Date | null) =>
    d
      ? d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "—";

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
      <StatusBadge status={invoice.status} />

      <span className="font-mono text-xs text-slate-500 shrink-0">{invoice.name}</span>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
          <span>
            <span className="text-slate-400">{t("financieel.col_datum")} </span>
            {fmtDate(invoice.postingDate)}
          </span>
          {invoice.dueDate && (
            <span>
              <span className="text-slate-400">{t("financieel.col_vervaldatum")} </span>
              {fmtDate(invoice.dueDate)}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-4 tabular-nums text-xs shrink-0">
        <div className="text-right">
          <p className="text-slate-400">{t("financieel.col_bedrag")}</p>
          <p className="font-medium text-slate-800">{fmtEuro(invoice.grandTotal)}</p>
        </div>
        {invoice.outstandingAmount > 0 && (
          <div className="text-right">
            <p className="text-slate-400">{t("financieel.col_openstaand")}</p>
            <p className="font-medium text-red-600">{fmtEuro(invoice.outstandingAmount)}</p>
          </div>
        )}
      </div>
    </li>
  );
}

// ── Hoofd-component ───────────────────────────────────────────────────

interface FinancieelTabProps {
  projectId: string;
  financials: ProjectFinancials | null;
}

export function FinancieelTab({ projectId, financials }: FinancieelTabProps) {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<SalesInvoice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    projectDetailService
      .getProjectInvoices(projectId)
      .then((data) => {
        if (!cancelled) setInvoices(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[FinancieelTab] getProjectInvoices mislukt:", err);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [projectId]);

  return (
    <div className="flex flex-col gap-6">

      {financials && <ContractSamenvatting financials={financials} />}

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          {t("financieel.title_facturen")}
        </h3>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400 animate-pulse">
            {t("financieel.loading")}
          </div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-red-500">
            {t("financieel.error")}
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-slate-600">{t("financieel.empty_title")}</p>
            <p className="mt-1 text-xs text-slate-400">{t("financieel.empty_body")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
            {invoices.map((inv) => (
              <InvoiceRow key={inv.name} invoice={inv} />
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
```

- [ ] **Stap 5: Controleer dat de build slaagt**

```bash
npm run build
```

Verwacht: geen fouten. Als `fmtEuro` niet gevonden wordt: importpad is `"../kpi-helpers"` (relatief vanuit `src/components/detail/financieel/`).

- [ ] **Stap 6: Commit**

```bash
git add src/components/detail/financieel/FinancieelTab.tsx \
        src/i18n/nl.json \
        src/i18n/en.json
git commit -m "financieel-tab: FinancieelTab component + i18n strings"
```

---

## Task 3: Wire FinancieelTab into DetailPanel

**Files:**
- Modify: `src/components/detail/DetailPanel.tsx`

- [ ] **Stap 1: Lees de relevante secties**

Lees `src/components/detail/DetailPanel.tsx` regels 1–20 en regels 225–265.

- [ ] **Stap 2: Voeg import toe**

Zoek (gebruik de laatste bestaande tab-import als anker):
```typescript
import { CalculatieTab } from "./calculatie/CalculatieTab";
```

Voeg **daarna** in:
```typescript
import { FinancieelTab } from "./financieel/FinancieelTab";
```

- [ ] **Stap 3: Voeg financieel-case toe in de tab-routing**

Zoek:
```tsx
              ) : activeTab === "calculatie" ? (
                <CalculatieTab projectId={detail!.id} />
              ) : activeTab === "overzicht" ? (
```

Vervang door:
```tsx
              ) : activeTab === "calculatie" ? (
                <CalculatieTab projectId={detail!.id} />
              ) : activeTab === "financieel" ? (
                <FinancieelTab projectId={detail!.id} financials={financials} />
              ) : activeTab === "overzicht" ? (
```

- [ ] **Stap 4: Controleer dat de build slaagt**

```bash
npm run build
```

Verwacht: geen fouten. TypeScript verifieert dat `financials: ProjectFinancials | null` matcht met `FinancieelTabProps`.

- [ ] **Stap 5: Commit**

```bash
git add src/components/detail/DetailPanel.tsx
git commit -m "financieel-tab: wire FinancieelTab in DetailPanel"
```

**STOP: Eelke opent PROJ-0009 (mock-mode), klikt op Financieel, en ziet: contractsamenvatting (€1.150K aanneemsom, €45K meerwerk, €437K gefactureerd, €758K openstaand) + twee facturen (SINV-2026-00012 "Betaald" + SINV-2026-00031 "Vervallen" met rood openstaand bedrag). Eelke opent een ander project en ziet de lege staat.**

---

## Spec coverage controle

| Vereiste | Taak |
|----------|------|
| Financieel-tab vervangt placeholder | Task 3 |
| Contractsamenvatting (aanneemsom / meerwerk / gefactureerd / openstaand) | Task 2 (`ContractSamenvatting`) |
| Facturenlijst per project | Task 2 (`InvoiceRow`) |
| Betaalstatus per factuur (Betaald / Vervallen / Openstaand / Gedeeltelijk / Creditnota) | Task 2 (`StatusBadge` + `STATUS_STYLE`) |
| Factuurnummer, factuurdatum, vervaldatum | Task 2 (`InvoiceRow`) |
| Factuurbedrag + openstaand bedrag | Task 2 (`fmtEuro`) |
| Geen dubbele API-aanroep voor samenvatting | Task 3 (`financials` als prop vanuit `DetailPanel` state — regel 78) |
| ERPNext Sales Invoice implementatie | Task 1 (`fetchList("Sales Invoice", ...)`) |
| Mock voor lokaal testen (betaald + vervallen factuur) | Task 1 (`MOCK_INVOICES` voor PROJ-0009) |
| Loading / error / lege staat | Task 2 |
| i18n nl + en | Task 2 |
