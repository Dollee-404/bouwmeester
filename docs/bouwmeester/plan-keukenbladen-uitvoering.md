# Keukenbladen — Correctheid & Voltooiing (Plan A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De keukenbladen-flow in Bouwmeester correct en compleet maken: offertes koppelen via `kbf_project` (niet via klantnaam), gecancelde offertes uitsluiten, fasestemplate toevoegen, en de werkplaatstekening zichtbaar maken vanuit de calculatie-tab.

**Architecture:** Elk stuk werk wijzigt één laag tegelijk: eerst het datamodel (types + service-interface), dan de ERPNext-implementatie + mock, dan de UI-laag. Zo blijft TypeScript blij en zijn commits klein en verifieerbaar.

**Tech Stack:** React 19, TypeScript 5, Vite 8, Tailwind v4, ERPNext REST via postMessage-bridge (`src/bridge/index.ts`). Geen testframework — verificatie via `npm run build` (type-check + bundel) en handmatige browsercheck.

---

## Scopenota — 4 losse plannen

Dit is **Plan A** van vier onafhankelijke subsystemen. De andere plannen zijn apart te schrijven wanneer Plan A gemerged is:

| Plan | Inhoud |
|---|---|
| **A (dit plan)** | kbf_project veld, calculatie-filter, docstatus-filter, fasestemplate, tekening-link |
| **B** | RONDE 5 voltooiing: StatusFlow per werksoort (5G), KPI-set per werksoort (5I), polish (5J) |
| **C** | Documenten-tab: tekeningen uploaden, revisies, beschikbaar op werkvloer |
| **D** | Financieel-tab: Sales Invoice koppeling, betaalstatus, meerwerk |

---

## Bestandskaart

| Bestand | Actie | Reden |
|---|---|---|
| `src/data/custom-fields-spec.ts` | Wijzigen | `kbf_project` Link-veld toevoegen aan Quotation |
| `src/data/detail-types.ts` | Wijzigen | `tekenPdf` toevoegen aan `ProjectQuotation` |
| `src/data/project-detail-service.ts` | Wijzigen | Signatuur `getProjectQuotations(projectId)` |
| `src/data/project-detail-service-erpnext.ts` | Wijzigen | Filter op `kbf_project` + `docstatus`, lees `kbf_tekening_pdf` |
| `src/data/project-detail-service-mock.ts` | Wijzigen | Mock herindexeren op projectId, tekenPdf toevoegen |
| `src/data/default-phase-templates.ts` | Wijzigen | Fasestemplate Keukenbladen toevoegen |
| `src/components/detail/calculatie/CalculatieTab.tsx` | Wijzigen | Prop `customerName` → `projectId` |
| `src/components/detail/DetailPanel.tsx` | Wijzigen | `<CalculatieTab projectId={detail!.id} />` |
| `src/components/detail/calculatie/QuotationCard.tsx` | Wijzigen | Werkplaatstekening download-knop |
| `src/i18n/nl.json` | Wijzigen | Sleutel `calculatie.tekening` toevoegen |

---

## Task 1: kbf_project veld registreren in custom-fields-spec

**Doel:** Als Bouwmeester's setup-wizard draait op een verse ERPNext, installeert hij nu ook het `kbf_project` Link-veld op Quotation. Zonder dit veld geeft de filter in Task 2 altijd leeg terug.

**Files:**
- Modify: `src/data/custom-fields-spec.ts`

---

- [ ] **Stap 1: Voeg het veld toe aan REQUIRED_CUSTOM_FIELDS**

Open `src/data/custom-fields-spec.ts`. Voeg toe na de Sales Order entry, vóór de eerste Task entry:

```typescript
  {
    // Koppelt een keukenblad-offerte aan het Bouwmeester-project dat via
    // DoordrukkenWizard is aangemaakt. Gezet door quotationsService.linkQuotationToProject().
    dt: "Quotation",
    fieldname: "kbf_project",
    label: "Bouwmeester Project",
    fieldtype: "Link",
    options: "Project",
    insert_after: "customer_address",
  },
```

- [ ] **Stap 2: Verifieer TypeScript**

```bash
npm run build
```

Verwacht: build slaagt zonder errors.

- [ ] **Stap 3: Commit**

```bash
git add src/data/custom-fields-spec.ts
git commit -m "feat(keukenbladen): kbf_project veld registreren in custom-fields-spec"
```

---

## Task 2: getProjectQuotations filteren op kbf_project + docstatus

**Doel:** Offertes ophalen op basis van het project-ID (niet de klantnaam). Geannuleerde offertes (`docstatus = 2`) worden uitgesloten.

**Context:**
- Huidige filter: `[party_name = customerName, kbf_opname = 1]`
- Nieuwe filter: `[kbf_project = projectId, docstatus != 2]`
- ERPNext laat Link-velden niet terugkomen in list-responses, maar filteren erop werkt wél
- `docstatus` waarden: 0 = Draft, 1 = Submitted, 2 = Geannuleerd

**Files:**
- Modify: `src/data/project-detail-service.ts` (interface + proxy)
- Modify: `src/data/project-detail-service-erpnext.ts` (implementatie)
- Modify: `src/data/project-detail-service-mock.ts` (mock data + implementatie)

---

- [ ] **Stap 1: Wijzig de interface in project-detail-service.ts**

Zoek in `src/data/project-detail-service.ts`:

```typescript
  /** Haal alle keukenblad-offertes op voor de opgegeven klant. */
  getProjectQuotations(customerName: string): Promise<ProjectQuotation[]>;
```

Vervang door:

```typescript
  /** Haal alle keukenblad-offertes op voor het opgegeven project (via kbf_project). */
  getProjectQuotations(projectId: string): Promise<ProjectQuotation[]>;
```

Zoek ook de proxy-delegatie onderaan hetzelfde bestand:

```typescript
  getProjectQuotations: async (customerName) => (await getService()).getProjectQuotations(customerName),
```

Vervang door:

```typescript
  getProjectQuotations: async (projectId) => (await getService()).getProjectQuotations(projectId),
```

- [ ] **Stap 2: Wijzig de ERPNext-implementatie**

Open `src/data/project-detail-service-erpnext.ts`. Vervang de volledige `getProjectQuotations`-functie:

```typescript
  async getProjectQuotations(projectId: string): Promise<ProjectQuotation[]> {
    const list = await fetchList<{ name: string }>("Quotation", {
      filters: [
        ["kbf_project", "=", projectId],
        ["docstatus", "!=", 2],
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
      tekenPdf: null,
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

`tekenPdf: null` is tijdelijk — Task 5 vult dit correct in. Laat het nu op `null` staan zodat de build slaagt voordat de types zijn bijgewerkt.

- [ ] **Stap 3: Wijzig de mock-implementatie**

Open `src/data/project-detail-service-mock.ts`.

Vervang de sleutel van `MOCK_QUOTATIONS` (`"Gemeente Sliedrecht"` → `"PROJ-0009"`):

```typescript
const MOCK_QUOTATIONS: Record<string, ProjectQuotation[]> = {
  "PROJ-0009": [
```

`PROJ-0009` is het mock-project voor "Gemeente Sliedrecht" (te vinden in `src/data/projects-service-mock.ts` regel 142).

Voeg `tekenPdf: null` toe aan elk object binnen de array:

```typescript
  "PROJ-0009": [
    {
      name: "QTN-0001",
      customerName: "Gemeente Sliedrecht",
      transactionDate: new Date("2025-01-15"),
      meetdatum: new Date("2025-01-14"),
      inmeter: "Jan de Vries",
      tekenPdf: null,
      items: [ /* ongewijzigd */ ],
    },
    // herhaal tekenPdf: null voor elk mock-object
  ],
```

Vervang de functie-signature van de mock-implementatie:

```typescript
  async getProjectQuotations(projectId: string): Promise<ProjectQuotation[]> {
    await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
    const quotes = MOCK_QUOTATIONS[projectId] ?? [];
    return quotes.map((q) => ({
      ...q,
      items: q.items.map((item) => {
        const rate = mockRates[`${q.name}:${item.rowName}`] ?? item.rate;
        return { ...item, rate, amount: rate * item.qty };
      }),
    }));
  },
```

- [ ] **Stap 4: Verifieer TypeScript**

```bash
npm run build
```

Verwacht: build slaagt. Als TypeScript klaagt over `tekenPdf` als onbekende property, controleer of je in Stap 3 alle mock-objecten hebt bijgewerkt.

- [ ] **Stap 5: Commit**

```bash
git add src/data/project-detail-service.ts \
        src/data/project-detail-service-erpnext.ts \
        src/data/project-detail-service-mock.ts
git commit -m "fix(calculatie): filter offertes op kbf_project + sluit geannuleerde uit"
```

---

## Task 3: CalculatieTab prop customerName → projectId

**Doel:** De tab ontvangt nu het project-ID zodat de service-call overeenkomt met de gewijzigde interface.

**Files:**
- Modify: `src/components/detail/calculatie/CalculatieTab.tsx`
- Modify: `src/components/detail/DetailPanel.tsx`

---

- [ ] **Stap 1: Pas CalculatieTab aan**

Open `src/components/detail/calculatie/CalculatieTab.tsx`. Vervang de interface:

```typescript
interface CalculatieTabProps {
  /** ERPNext Customer-docname, gelijk aan Project.customer */
  customerName: string;
}
```

Door:

```typescript
interface CalculatieTabProps {
  /** ERPNext Project-docname — wordt gebruikt als kbf_project filter op Quotation */
  projectId: string;
}
```

Vervang destructuring en dependency in de component:

```typescript
export function CalculatieTab({ projectId }: CalculatieTabProps) {
```

En in de `useEffect`:

```typescript
    projectDetailService
      .getProjectQuotations(projectId)
```

En de dependency array:

```typescript
  }, [projectId]);
```

- [ ] **Stap 2: Pas DetailPanel aan**

Open `src/components/detail/DetailPanel.tsx`. Zoek:

```tsx
              ) : activeTab === "calculatie" ? (
                <CalculatieTab customerName={detail!.customerName} />
```

Vervang door:

```tsx
              ) : activeTab === "calculatie" ? (
                <CalculatieTab projectId={detail!.id} />
```

- [ ] **Stap 3: Verifieer TypeScript**

```bash
npm run build
```

Verwacht: build slaagt zonder errors.

- [ ] **Stap 4: Handmatige browsercheck**

`npm run dev` → open `http://localhost:5200`

Open project PROJ-0009 (Gemeente Sliedrecht). Tab Calculatie: offertes moeten zichtbaar zijn.  
Open een ander project (bijv. Renovatie). Tab Calculatie: leeg — "Geen offertes gevonden".

- [ ] **Stap 5: Commit**

```bash
git add src/components/detail/calculatie/CalculatieTab.tsx \
        src/components/detail/DetailPanel.tsx
git commit -m "fix(calculatie): prop customerName vervangen door projectId"
```

---

## Task 4: Fasestemplate Keukenbladen toevoegen

**Doel:** De knop "Standaard fases toevoegen" werkt nu ook voor Keukenbladen-projecten.

**Context:** `getPhaseTemplate("Keukenbladen")` geeft momenteel `null` terug. `PhasesSection.tsx` toont de knop alleen als `getPhaseTemplate(werksoort)` niet-null is.

**Files:**
- Modify: `src/data/default-phase-templates.ts`

---

- [ ] **Stap 1: Voeg Keukenbladen toe aan DEFAULT_PHASE_TEMPLATES**

Open `src/data/default-phase-templates.ts`. Voeg toe na de Onderhoud-entry:

```typescript
  {
    werksoort: "Keukenbladen",
    phases: [
      "Calculatie & offerte",
      "Tekening goedkeuren",
      "Productie bij Vasto",
      "Levering",
      "Montage",
      "Oplevering",
    ],
  },
```

- [ ] **Stap 2: Verifieer TypeScript**

```bash
npm run build
```

Verwacht: build slaagt.

- [ ] **Stap 3: Handmatige browsercheck**

Open PROJ-0009 (Gemeente Sliedrecht, werksoort Keukenbladen). Tab Overzicht. Als er nog geen fases zijn, verschijnt de knop "Standaard fases voor Keukenbladen toevoegen". Klik: 6 fases moeten worden aangemaakt.

- [ ] **Stap 4: Commit**

```bash
git add src/data/default-phase-templates.ts
git commit -m "feat(keukenbladen): fasestemplate toevoegen voor werksoort Keukenbladen"
```

---

## Task 5: Werkplaatstekening download-link in QuotationCard

**Doel:** Als de opname-app een werkplaatstekening PDF heeft geüpload (`kbf_tekening_pdf`), verschijnt een download-knop in de QuotationCard header.

**Context:**
- `kbf_tekening_pdf` is een Attach-veld in ERPNext — slaat een bestandspad op zoals `/files/tekening-qtn-0001.pdf`
- Volledige URL = `ERPNEXT_URL + kbf_tekening_pdf` (ERPNEXT_URL geëxporteerd uit `src/bridge/index.ts`)
- In mock-mode is `ERPNEXT_URL` leeg en `tekenPdf` is `null` — knop verschijnt niet

**Files:**
- Modify: `src/data/detail-types.ts`
- Modify: `src/data/project-detail-service-erpnext.ts`
- Modify: `src/components/detail/calculatie/QuotationCard.tsx`
- Modify: `src/i18n/nl.json`

---

- [ ] **Stap 1: Voeg tekenPdf toe aan het ProjectQuotation type**

Open `src/data/detail-types.ts`. Zoek `export interface ProjectQuotation` en voeg `tekenPdf` toe na `inmeter`:

```typescript
export interface ProjectQuotation {
  name: string;
  customerName: string;
  transactionDate: Date;
  meetdatum: Date | null;
  inmeter: string | null;
  /** Bestandspad van de werkplaatstekening PDF (kbf_tekening_pdf), bijv. "/files/tekening.pdf" */
  tekenPdf: string | null;
  items: QuotationItem[];
}
```

- [ ] **Stap 2: Voeg kbf_tekening_pdf toe aan RawQuotation en de mapping**

Open `src/data/project-detail-service-erpnext.ts`.

Voeg het veld toe aan de `RawQuotation` interface (rond regel 104):

```typescript
interface RawQuotation {
  name: string;
  party_name: string;
  transaction_date: string;
  kbf_meetdatum: string | null;
  kbf_inmeter: string | null;
  kbf_tekening_pdf: string | null;
  items: RawQuotationItem[];
}
```

Vervang `tekenPdf: null` in de mapping (gezet in Task 2) door:

```typescript
      tekenPdf: doc.kbf_tekening_pdf ?? null,
```

- [ ] **Stap 3: Voeg de i18n-sleutel toe**

Open `src/i18n/nl.json`. Voeg toe aan de `calculatie`-sectie, na `"save_error"`:

```json
    "tekening": "Werkplaatstekening"
```

- [ ] **Stap 4: Voeg de download-knop toe aan QuotationCard**

Open `src/components/detail/calculatie/QuotationCard.tsx`.

Voeg imports toe:

```typescript
import { FileDown } from "lucide-react";
import { ERPNEXT_URL } from "../../../bridge";
```

Voeg de download-knop toe in de header `<div>`, vóór de `<span className="ml-auto ...">`:

```tsx
        {quotation.tekenPdf && (
          <a
            href={`${ERPNEXT_URL}${quotation.tekenPdf}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-y-teal hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal rounded"
          >
            <FileDown size={13} aria-hidden />
            {t("calculatie.tekening")}
          </a>
        )}
        <span className="ml-auto text-xs font-mono text-slate-400">
          {quotation.name}
        </span>
```

- [ ] **Stap 5: Verifieer TypeScript**

```bash
npm run build
```

Verwacht: build slaagt zonder errors.

- [ ] **Stap 6: Commit**

```bash
git add src/data/detail-types.ts \
        src/data/project-detail-service-erpnext.ts \
        src/components/detail/calculatie/QuotationCard.tsx \
        src/i18n/nl.json
git commit -m "feat(calculatie): werkplaatstekening download-link tonen vanuit kbf_tekening_pdf"
```

---

## Self-Review

### 1. Spec coverage

| Prioriteit uit inventarisatie | Afgedekt door |
|---|---|
| `kbf_project` toevoegen aan custom-fields-spec | Task 1 |
| Calculatie-tab: filter op `kbf_project` | Task 2 + Task 3 |
| Calculatie-tab: offerte-status filteren | Task 2 (docstatus != 2) |
| Fasestemplate Keukenbladen | Task 4 |
| Werkplaatstekening link | Task 5 |
| ~~Totaalrij per offerte~~ | Al aanwezig in `QuotationItemsTable.tsx` (`grandTotal` + `tfoot`) |

### 2. Placeholder scan

Geen TBD, TODO of "implementeer later" aangetroffen.

### 3. Type consistency

- `ProjectQuotation.tekenPdf: string | null` — gedefinieerd in Task 5 Stap 1, gebruikt in Task 5 Stap 2 en Stap 4. ✅
- `getProjectQuotations(projectId: string)` — interface Task 2 Stap 1, implementaties Task 2 Stap 2-3, callsite Task 3. ✅
- `tekenPdf: null` tijdelijk in Task 2 Stap 2 — dit veroorzaakt een build-fout zodra Task 5 Stap 1 het type uitbreidt. Voer de taken **in volgorde** uit zodat het type pas wordt toegevoegd ná de implementatie. ✅

---

### Klantwens-dekking na Plan A

| Klantwens | Na Plan A |
|---|---|
| Duidelijke structuur order → productie | ✅ Fasestemplate geeft 6 keukenbladen-fasen |
| Tekeningen beschikbaar op werkvloer | ✅ Werkplaatstekening zichtbaar in calculatie-tab |
| Koppeling verkoop ↔ werkvoorbereiding | ✅ kbf_project koppelt offerte correct aan project |
| Voorraadbeheer | ❌ Plan C |
| Facturatie | ❌ Plan D |
