# Doordrukken: Opname → Project — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toon ontkoppelde keukenblad-opnames (ERPNext Quotations met `kbf_opname=1` zonder project) als speciale kaartjes in de Aanvraag-kolom, en bied een "Doordrukken"-wizard om ze met één klik om te zetten naar een project.

**Architecture:** Een nieuwe `quotationsService` (ERPNext + mock, zelfde patroon als `projectsService`) haalt ontkoppelde opnames op. Data stroomt van `useUnlinkedQuotations` hook → `ProjectsPage` → `KanbanBoard` → `KanbanColumn` (alleen Lead-kolom). De `DoordrukkenWizard` hergebruikt `projectsService.createProject()` en koppelt daarna `kbf_project` op de Quotation via `quotationsService.linkQuotationToProject()`. Na aanmaken verdwijnt de opnamekaart en opent het nieuwe project.

**Tech Stack:** TypeScript · React 19 · Tailwind CSS v4 · lucide-react · @dnd-kit (niet aangeraakt)

---

## ⚠️ Pre-flight: ERPNext custom field vereiste

Voeg `kbf_project` toe aan het Quotation-doctype in ERPNext voordat je de ERPNext-implementatie live zet:
- **Customize Form → Quotation → Add Field**
- Field Type: **Link** · Options: **Project** · Field Name: `kbf_project` · Label: `Project`
- Insert After: `kbf_opname_json`

Tijdens ontwikkeling werkt alles met mock-data zonder dit field.

---

## Bestandskaart

| Bestand | Actie | Verantwoordelijkheid |
|---------|-------|---------------------|
| `src/data/detail-types.ts` | Wijzigen | Voeg `UnlinkedQuotation` type toe |
| `src/data/quotations-service.ts` | Aanmaken | Service-interface |
| `src/data/quotations-service-erpnext.ts` | Aanmaken | ERPNext-implementatie |
| `src/data/quotations-service-mock.ts` | Aanmaken | Mock-implementatie |
| `src/data/index.ts` | Wijzigen | Exporteer `quotationsService` |
| `src/hooks/use-unlinked-quotations.ts` | Aanmaken | React hook |
| `src/components/kanban/OpnameCard.tsx` | Aanmaken | Kanban-kaartje voor ontkoppelde opname |
| `src/components/kanban/KanbanColumn.tsx` | Wijzigen | Accepteer opname-kaartjes voor Lead |
| `src/components/kanban/KanbanBoard.tsx` | Wijzigen | Doorsturen van opnames + onDoordrukken |
| `src/components/projects/DoordrukkenWizard.tsx` | Aanmaken | Modal: opname → project |
| `src/pages/ProjectsPage.tsx` | Wijzigen | Hook + wizard + callbacks |
| `src/i18n/nl.json` | Wijzigen | Vertalingen |

---

## Task 1: i18n — vertalingen

**Files:**
- Modify: `src/i18n/nl.json`

- [ ] **Stap 1: Voeg opname_card en doordrukken vertalingen toe**

Voeg toe na de sluitende `}` van de `"wizard"`-sectie (rond regel 218):

```json
"opname_card": {
  "badge": "Opname",
  "meetdatum": "Opname op",
  "inmeter": "door",
  "items_one": "{{count}} regel",
  "items_other": "{{count}} regels",
  "doordrukken": "Doordrukken"
},
"doordrukken": {
  "title": "Opname doordrukken",
  "subtitle": "Maak een project aan op basis van deze keukenblad-opname.",
  "summary_label": "Opname-samenvatting",
  "project_name_label": "Projectnaam",
  "project_name_required": "— verplicht veld",
  "werksoort_label": "Werksoort",
  "customer_label": "Klant",
  "date_label": "Startdatum",
  "submit": "Aanmaken als project",
  "creating": "Aanmaken...",
  "error_generic": "Aanmaken mislukt. Probeer het opnieuw."
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
git commit -m "feat(doordrukken): i18n voor opname-kaart en doordrukken-wizard"
```

---

## Task 2: Types — UnlinkedQuotation

**Files:**
- Modify: `src/data/detail-types.ts`

- [ ] **Stap 1: Voeg UnlinkedQuotation toe onderaan detail-types.ts**

```typescript
/** Minimale data voor een opname-kaartje — Quotation zonder kbf_project */
export interface UnlinkedQuotation {
  /** ERPNext Quotation-docname, bijv. "QTN-0001" */
  name: string;
  /** party_name — ERPNext Customer-docname */
  customerName: string;
  transactionDate: Date;
  /** Datum van de keukenblad-opname (kbf_meetdatum) */
  meetdatum: Date | null;
  /** Naam van de inmeter/verkoper (kbf_inmeter) */
  inmeter: string | null;
  /** Totaal aantal regelitems voor weergave op de kaart */
  itemCount: number;
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
git commit -m "feat(doordrukken): type UnlinkedQuotation"
```

---

## Task 3: Quotations service — interface, ERPNext, mock en export

**Files:**
- Create: `src/data/quotations-service.ts`
- Create: `src/data/quotations-service-erpnext.ts`
- Create: `src/data/quotations-service-mock.ts`
- Modify: `src/data/index.ts`

- [ ] **Stap 1: Schrijf quotations-service.ts**

```typescript
// src/data/quotations-service.ts
import type { UnlinkedQuotation } from "./detail-types";

export interface QuotationsService {
  /** Haal alle keukenblad-opnames op die nog niet aan een project zijn gekoppeld. */
  getUnlinkedQuotations(): Promise<UnlinkedQuotation[]>;
  /** Sla kbf_project op de Quotation op — koppelt de opname aan het nieuwe project. */
  linkQuotationToProject(quotationName: string, projectId: string): Promise<void>;
}
```

- [ ] **Stap 2: Schrijf quotations-service-erpnext.ts**

```typescript
// src/data/quotations-service-erpnext.ts
import { fetchList, updateDocument } from "../bridge";
import type { UnlinkedQuotation } from "./detail-types";
import type { QuotationsService } from "./quotations-service";

interface RawQuotation {
  name: string;
  party_name: string;
  transaction_date: string;   // "YYYY-MM-DD"
  kbf_meetdatum: string | null;
  kbf_inmeter: string | null;
  kbf_project: string | null;
  total_qty: number | null;   // proxy voor regelaantal
}

export const erpnextQuotationsService: QuotationsService = {
  async getUnlinkedQuotations(): Promise<UnlinkedQuotation[]> {
    const all = await fetchList<RawQuotation>("Quotation", {
      filters: [["kbf_opname", "=", 1]],
      fields: [
        "name",
        "party_name",
        "transaction_date",
        "kbf_meetdatum",
        "kbf_inmeter",
        "kbf_project",
        "total_qty",
      ],
      order_by: "transaction_date desc",
      limit_page_length: 200,
    });

    // Filter client-side: alleen opnames zonder project-koppeling
    return all
      .filter((q) => !q.kbf_project)
      .map((q): UnlinkedQuotation => ({
        name: q.name,
        customerName: q.party_name,
        transactionDate: new Date(q.transaction_date),
        meetdatum: q.kbf_meetdatum ? new Date(q.kbf_meetdatum) : null,
        inmeter: q.kbf_inmeter ?? null,
        itemCount: Math.round(q.total_qty ?? 0),
      }));
  },

  async linkQuotationToProject(quotationName: string, projectId: string): Promise<void> {
    await updateDocument("Quotation", quotationName, { kbf_project: projectId });
  },
};
```

- [ ] **Stap 3: Schrijf quotations-service-mock.ts**

```typescript
// src/data/quotations-service-mock.ts
import type { UnlinkedQuotation } from "./detail-types";
import type { QuotationsService } from "./quotations-service";

const MOCK_UNLINKED: UnlinkedQuotation[] = [
  {
    name: "QTN-MOCK-001",
    customerName: "Papendrecht Vastgoed BV",
    transactionDate: new Date("2026-05-20"),
    meetdatum: new Date("2026-05-18"),
    inmeter: "J. de Vries",
    itemCount: 7,
  },
  {
    name: "QTN-MOCK-002",
    customerName: "Eelke Dollee",
    transactionDate: new Date("2026-05-22"),
    meetdatum: new Date("2026-05-21"),
    inmeter: "R. Bakker",
    itemCount: 4,
  },
];

// In-memory koppeling per sessie (mock only)
const linked = new Set<string>();

export const mockQuotationsService: QuotationsService = {
  async getUnlinkedQuotations(): Promise<UnlinkedQuotation[]> {
    await new Promise((r) => setTimeout(r, 200));
    return MOCK_UNLINKED.filter((q) => !linked.has(q.name));
  },

  async linkQuotationToProject(quotationName: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 300));
    linked.add(quotationName);
  },
};
```

- [ ] **Stap 4: Exporteer quotationsService vanuit data/index.ts**

Vervang de volledige inhoud van `src/data/index.ts`:

```typescript
import { INSTANCE_ID } from "../bridge";
import { erpnextService } from "./projects-service-erpnext";
import { mockService } from "./projects-service-mock";
import { erpnextQuotationsService } from "./quotations-service-erpnext";
import { mockQuotationsService } from "./quotations-service-mock";
import type { ProjectsService } from "./projects-service";
import type { QuotationsService } from "./quotations-service";

export const projectsService: ProjectsService = INSTANCE_ID ? erpnextService : mockService;
export const quotationsService: QuotationsService = INSTANCE_ID
  ? erpnextQuotationsService
  : mockQuotationsService;

export type { ProjectsService, QuotationsService };
export type { Project, BouwmeesterStatus, Werksoort, ListOptions } from "./types";
```

- [ ] **Stap 5: Controleer compilatie**

```bash
npx tsc --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 6: Commit**

```bash
git add src/data/quotations-service.ts src/data/quotations-service-erpnext.ts src/data/quotations-service-mock.ts src/data/index.ts
git commit -m "feat(doordrukken): quotations service — interface, ERPNext, mock en export"
```

---

## Task 4: useUnlinkedQuotations hook

**Files:**
- Create: `src/hooks/use-unlinked-quotations.ts`

- [ ] **Stap 1: Schrijf de hook (zelfde patroon als use-projects.ts)**

```typescript
// src/hooks/use-unlinked-quotations.ts
import { useState, useEffect, useCallback, useRef } from "react";
import type { UnlinkedQuotation } from "../data/detail-types";
import { quotationsService } from "../data";

export function useUnlinkedQuotations() {
  const [quotations, setQuotations] = useState<UnlinkedQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (hasLoadedOnce.current) {
      setIsRefetching(true);
    } else {
      setLoading(true);
    }
    setError(null);

    quotationsService
      .getUnlinkedQuotations()
      .then((data) => {
        if (!cancelled) {
          setQuotations(data);
          hasLoadedOnce.current = true;
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setIsRefetching(false);
        }
      });

    return () => { cancelled = true; };
  }, [refetchKey]);

  const refetch = useCallback(() => setRefetchKey((k) => k + 1), []);

  return { quotations, loading, isRefetching, error, refetch };
}
```

- [ ] **Stap 2: Controleer compilatie**

```bash
npx tsc --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 3: Commit**

```bash
git add src/hooks/use-unlinked-quotations.ts
git commit -m "feat(doordrukken): useUnlinkedQuotations hook"
```

---

## Task 5: OpnameCard — kanban-kaartje voor ontkoppelde opname

**Files:**
- Create: `src/components/kanban/OpnameCard.tsx`

Zelfde afmetingen als `ProjectCard`. Links-border teal `#0A7384` (Keukenbladen-kleur). Achtergrond licht teal. "Doordrukken"-pijl altijd zichtbaar.

- [ ] **Stap 1: Schrijf OpnameCard.tsx**

```typescript
// src/components/kanban/OpnameCard.tsx
import type React from "react";
import { Calendar, User, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UnlinkedQuotation } from "../../data/detail-types";

interface OpnameCardProps {
  quotation: UnlinkedQuotation;
  onDoordrukken: (quotation: UnlinkedQuotation) => void;
  tabIndex?: number;
}

const KEUKENBLADEN_DEEP = "#0A7384";
const KEUKENBLADEN_LIGHT = "#C2DCE0";

function formatDate(date: Date): string {
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export function OpnameCard({ quotation, onDoordrukken, tabIndex = 0 }: OpnameCardProps) {
  const { t } = useTranslation();

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onDoordrukken(quotation);
    }
  }

  return (
    <div
      role="button"
      tabIndex={tabIndex}
      aria-label={`Opname ${quotation.customerName} doordrukken`}
      className="cursor-pointer hover:shadow-md transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal focus-visible:ring-offset-1"
      style={{
        backgroundColor: "#f0f9fa",
        borderTop: `0.5px solid ${KEUKENBLADEN_LIGHT}`,
        borderRight: `0.5px solid ${KEUKENBLADEN_LIGHT}`,
        borderBottom: `0.5px solid ${KEUKENBLADEN_LIGHT}`,
        borderLeft: `3px solid ${KEUKENBLADEN_DEEP}`,
        borderRadius: "0 8px 8px 0",
        padding: "12px",
      }}
      onClick={() => onDoordrukken(quotation)}
      onKeyDown={handleKeyDown}
    >
      {/* Row 1: badge + docname */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: KEUKENBLADEN_LIGHT, color: KEUKENBLADEN_DEEP }}
        >
          {t("opname_card.badge")}
        </span>
        <span className="text-[11px] font-mono text-slate-400">{quotation.name}</span>
      </div>

      {/* Row 2: klant */}
      <div className="mb-2">
        <p className="text-[14px] font-medium text-slate-900 leading-snug line-clamp-2">
          {quotation.customerName}
        </p>
      </div>

      {/* Row 3: meetdatum */}
      {quotation.meetdatum && (
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500 mb-1">
          <Calendar size={12} className="shrink-0" aria-hidden="true" />
          <span>
            {t("opname_card.meetdatum")} {formatDate(quotation.meetdatum)}
          </span>
        </div>
      )}

      {/* Row 4: inmeter + regelaantal */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2.5">
        {quotation.inmeter ? (
          <span className="flex items-center gap-1">
            <User size={11} aria-hidden="true" />
            {quotation.inmeter}
          </span>
        ) : (
          <span />
        )}
        <span>{t("opname_card.items", { count: quotation.itemCount })}</span>
      </div>

      {/* Row 5: doordrukken-actie */}
      <div className="flex items-center justify-end">
        <span
          className="flex items-center gap-1 text-[12px] font-medium"
          style={{ color: KEUKENBLADEN_DEEP }}
        >
          {t("opname_card.doordrukken")}
          <ArrowRight size={13} aria-hidden="true" />
        </span>
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
git add src/components/kanban/OpnameCard.tsx
git commit -m "feat(doordrukken): OpnameCard kanban-kaartje"
```

---

## Task 6: KanbanColumn + KanbanBoard — opnames doorsturen

**Files:**
- Modify: `src/components/kanban/KanbanColumn.tsx`
- Modify: `src/components/kanban/KanbanBoard.tsx`

- [ ] **Stap 1: Vervang KanbanColumn.tsx volledig**

```typescript
// src/components/kanban/KanbanColumn.tsx
import { useDroppable } from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import type { BouwmeesterStatus, Project } from "../../data/types";
import type { UnlinkedQuotation } from "../../data/detail-types";
import { STATUS_COLORS, STATUS_LABEL_KEYS } from "./status-config";
import { DraggableProjectCard } from "./DraggableProjectCard";
import { ProjectCardSkeleton } from "./ProjectCardSkeleton";
import { OpnameCard } from "./OpnameCard";

interface KanbanColumnProps {
  status: BouwmeesterStatus;
  projects: Project[];
  savingIds?: Set<string>;
  isLoading?: boolean;
  onCardClick?: (project: Project) => void;
  onAddNew?: (status: BouwmeesterStatus) => void;
  /** Alleen relevant voor de Lead-kolom */
  quotations?: UnlinkedQuotation[];
  onOpnameClick?: (quotation: UnlinkedQuotation) => void;
}

// Geen React.memo: @dnd-kit's useDroppable() subscribeert
// op DndContext, dat bij elke drag-tick update. Memo is
// daardoor effectloos.
export function KanbanColumn({
  status,
  projects,
  savingIds,
  isLoading = false,
  onCardClick,
  onAddNew,
  quotations = [],
  onOpnameClick,
}: KanbanColumnProps) {
  const { t } = useTranslation();
  const color = STATUS_COLORS[status];
  const labelKey = STATUS_LABEL_KEYS[status];
  const { isOver, setNodeRef } = useDroppable({ id: status });
  const totalCount = projects.length + quotations.length;

  return (
    <div className="flex flex-col min-w-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 rounded-full"
            style={{ width: 8, height: 8, backgroundColor: color }}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-slate-700 truncate">
            {t(labelKey)}
          </span>
          <span className="shrink-0 bg-slate-200 text-slate-600 text-xs rounded-full px-[7px] py-px leading-tight">
            {totalCount}
          </span>
        </div>
        <button
          className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal"
          onClick={() => onAddNew?.(status)}
          aria-label={`Nieuw project in ${t(labelKey)}`}
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 flex flex-col rounded-lg transition-colors duration-150"
        style={
          isOver
            ? { backgroundColor: "rgba(0,104,118,0.06)", outline: "2px solid rgba(0,104,118,0.22)", outlineOffset: 2 }
            : undefined
        }
      >
        {isLoading ? (
          <div className="flex flex-col" style={{ gap: 10 }}>
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
          </div>
        ) : totalCount === 0 ? (
          <div
            className="flex items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-lg"
            style={{ minHeight: 72, padding: 16 }}
          >
            {t("projects.empty_column")}
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 10 }}>
            {/* Opname-kaartjes boven projectkaartjes — vragen om actie */}
            {quotations.map((q) => (
              <OpnameCard
                key={q.name}
                quotation={q}
                onDoordrukken={onOpnameClick ?? (() => {})}
              />
            ))}
            {projects.map((project) => (
              <DraggableProjectCard
                key={project.id}
                project={project}
                isSaving={savingIds?.has(project.id) ?? false}
                onClick={onCardClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Stap 2: Pas KanbanBoard.tsx aan**

Voeg de import toe na de bestaande imports (rond regel 18):

```typescript
import type { UnlinkedQuotation } from "../../data/detail-types";
```

Vervang de `KanbanBoardProps`-interface (rond regel 53):

```typescript
interface KanbanBoardProps {
  projects: Project[];
  showArchived?: boolean;
  isLoading?: boolean;
  onCardClick?: (project: Project) => void;
  onAddNew?: (status: BouwmeesterStatus) => void;
  onStatusChange?: (projectId: string, newStatus: BouwmeesterStatus) => Promise<void>;
  /** Ontkoppelde opnames — alleen zichtbaar in de Lead-kolom */
  unlinkedQuotations?: UnlinkedQuotation[];
  onDoordrukken?: (quotation: UnlinkedQuotation) => void;
}
```

Voeg de twee nieuwe props toe aan de destructuring in de functie-signatuur (na `onStatusChange`):

```typescript
unlinkedQuotations = [],
onDoordrukken,
```

Vervang het `columns.map`-blok in de render (de `<KanbanColumn>`-aanroep):

```typescript
{columns.map((status) => (
  <KanbanColumn
    key={status}
    status={status}
    projects={grouped[status]}
    savingIds={savingIds}
    isLoading={isLoading}
    onCardClick={onCardClick}
    onAddNew={onAddNew}
    quotations={status === "Lead" ? unlinkedQuotations : undefined}
    onOpnameClick={status === "Lead" ? onDoordrukken : undefined}
  />
))}
```

- [ ] **Stap 3: Controleer compilatie**

```bash
npx tsc --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 4: Commit**

```bash
git add src/components/kanban/KanbanColumn.tsx src/components/kanban/KanbanBoard.tsx
git commit -m "feat(doordrukken): KanbanColumn + KanbanBoard — opnames in Lead-kolom"
```

---

## Task 7: DoordrukkenWizard — modal

**Files:**
- Create: `src/components/projects/DoordrukkenWizard.tsx`

Dezelfde stijl als `NewProjectWizard.tsx`: backdrop, `max-w-lg`, header/body/footer structuur. Vult automatisch in: werksoort "Keukenbladen", klant (readonly), projectnaam, startdatum. Toont opname-samenvatting boven de velden.

- [ ] **Stap 1: Schrijf DoordrukkenWizard.tsx**

```typescript
// src/components/projects/DoordrukkenWizard.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Calendar, User, Hash } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { WERKSOORT_IDS } from "../../data/werksoort-config";
import { projectsService, quotationsService } from "../../data";
import type { UnlinkedQuotation } from "../../data/detail-types";
import type { Werksoort } from "../../data/types";

interface DoordrukkenWizardProps {
  quotation: UnlinkedQuotation;
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function DoordrukkenWizard({ quotation, onClose, onCreated }: DoordrukkenWizardProps) {
  const { t } = useTranslation();

  const [werksoort, setWerksoort] = useState<Werksoort>("Keukenbladen");
  const [projectName, setProjectName] = useState(`${quotation.customerName} — Keukenbladen`);
  const [startDate, setStartDate] = useState(
    quotation.meetdatum ? toIsoDate(quotation.meetdatum) : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ projectName: false });

  const projectNameError = touched.projectName && !projectName.trim();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, isSubmitting]);

  async function handleSubmit() {
    setTouched({ projectName: true });
    if (!projectName.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const newId = await projectsService.createProject({
        projectName: projectName.trim(),
        werksoort,
        customer: quotation.customerName,
        startDate: startDate || null,
      });
      await quotationsService.linkQuotationToProject(quotation.name, newId);
      onCreated(newId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "HOLIDAY_LIST_MISSING") {
        setSubmitError(t("wizard.error_holiday_list"));
      } else {
        setSubmitError(t("doordrukken.error_generic"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="doordrukken-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 id="doordrukken-title" className="text-base font-semibold text-slate-900">
              {t("doordrukken.title")}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t("doordrukken.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
            className="rounded-md p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal disabled:opacity-40"
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Opname-samenvatting */}
          <div className="rounded-lg bg-teal-50 border border-teal-100 px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">
              {t("doordrukken.summary_label")}
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <User size={13} className="text-teal-600 shrink-0" />
              {quotation.customerName}
            </div>
            {quotation.meetdatum && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Calendar size={13} className="text-teal-600 shrink-0" />
                {t("opname_card.meetdatum")} {formatDate(quotation.meetdatum)}
                {quotation.inmeter && (
                  <span className="text-slate-400">
                    · {t("opname_card.inmeter")} {quotation.inmeter}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Hash size={13} className="text-teal-600 shrink-0" />
              {t("opname_card.items", { count: quotation.itemCount })}
              <span className="font-mono text-xs text-slate-400 ml-1">{quotation.name}</span>
            </div>
          </div>

          {/* Werksoort */}
          <fieldset>
            <legend className="block text-sm font-medium text-slate-700 mb-2">
              {t("doordrukken.werksoort_label")}
            </legend>
            <div className="grid grid-cols-4 gap-2">
              {WERKSOORT_IDS.map((id) => {
                const checked = werksoort === id;
                return (
                  <label key={id} className="cursor-pointer">
                    <input
                      type="radio"
                      name="werksoort"
                      value={id}
                      checked={checked}
                      onChange={() => setWerksoort(id as Werksoort)}
                      className="sr-only"
                    />
                    <span
                      className={[
                        "flex items-center justify-center rounded-lg border-2 px-1.5 py-2",
                        "text-xs font-medium text-center leading-tight transition-colors select-none",
                        checked
                          ? "border-y-teal bg-teal-50 text-y-teal"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {t(`werksoort.${id.toLowerCase()}`)}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Projectnaam */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t("doordrukken.project_name_label")}
              <span aria-hidden="true" className="text-red-500 ml-0.5">*</span>
              {projectNameError && (
                <span className="ml-1.5 text-xs font-normal text-red-600">
                  {t("doordrukken.project_name_required")}
                </span>
              )}
            </label>
            <Input
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                if (e.target.value.trim()) setTouched({ projectName: false });
              }}
              onBlur={() => setTouched({ projectName: true })}
              className={projectNameError ? "border-red-300 focus:ring-red-400" : ""}
            />
          </div>

          {/* Klant — readonly weergave */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t("doordrukken.customer_label")}
            </label>
            <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
              {quotation.customerName}
            </div>
          </div>

          {/* Startdatum */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t("doordrukken.date_label")}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-y-teal focus:border-transparent"
            />
          </div>

          {submitError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 leading-snug">
              {submitError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? t("doordrukken.creating") : t("doordrukken.submit")}
          </Button>
        </div>
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
git add src/components/projects/DoordrukkenWizard.tsx
git commit -m "feat(doordrukken): DoordrukkenWizard modal"
```

---

## Task 8: ProjectsPage — alles samenbrengen

**Files:**
- Modify: `src/pages/ProjectsPage.tsx`

- [ ] **Stap 1: Voeg imports toe**

Voeg toe aan de bestaande import-regels:

```typescript
import { useUnlinkedQuotations } from "../hooks/use-unlinked-quotations";
import { DoordrukkenWizard } from "../components/projects/DoordrukkenWizard";
import type { UnlinkedQuotation } from "../data/detail-types";
```

- [ ] **Stap 2: Voeg hook en state toe**

Voeg toe na de bestaande `useProjects`-aanroep (rond regel 31):

```typescript
const { quotations: unlinkedQuotations, refetch: refetchQuotations } = useUnlinkedQuotations();
const [doordrukkenQuotation, setDoordrukkenQuotation] = useState<UnlinkedQuotation | null>(null);
```

- [ ] **Stap 3: Voeg handleDoordrukkenCreated toe**

Voeg toe na `handleWizardCreated` (rond regel 86):

```typescript
function handleDoordrukkenCreated(projectId: string) {
  setDoordrukkenQuotation(null);
  refetchQuotations();
  refetch();
  setSelectedProjectId(projectId);
}
```

- [ ] **Stap 4: Voeg props toe aan KanbanBoard**

Zoek `<KanbanBoard` in de JSX (rond regel 200) en voeg twee props toe:

```typescript
unlinkedQuotations={unlinkedQuotations}
onDoordrukken={setDoordrukkenQuotation}
```

Het volledige block ziet er zo uit:

```typescript
<KanbanBoard
  projects={filtered}
  showArchived={showArchived}
  isLoading={loading && !isRefetching}
  onCardClick={handleProjectClick}
  onAddNew={() => setWizardOpen(true)}
  onStatusChange={handleStatusChange}
  unlinkedQuotations={unlinkedQuotations}
  onDoordrukken={setDoordrukkenQuotation}
/>
```

- [ ] **Stap 5: Voeg DoordrukkenWizard toe aan JSX**

Voeg toe na de `{wizardOpen && <NewProjectWizard ... />}`-block (vlak voor sluitende `</main>`):

```typescript
{doordrukkenQuotation && (
  <DoordrukkenWizard
    quotation={doordrukkenQuotation}
    onClose={() => setDoordrukkenQuotation(null)}
    onCreated={handleDoordrukkenCreated}
  />
)}
```

- [ ] **Stap 6: Controleer compilatie**

```bash
npx tsc --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 7: Commit**

```bash
git add src/pages/ProjectsPage.tsx
git commit -m "feat(doordrukken): ProjectsPage wiring — hook, wizard en callbacks"
```

---

## Task 9: Handmatige browserverificatie

- [ ] **Stap 1: Start de dev-server**

```bash
npm run dev
```

Open `http://localhost:5173`.

- [ ] **Stap 2: Opname-kaartjes in Lead-kolom**

Ga naar het Kanban-bord. De Lead-kolom ("Aanvraag") toont boven de projectkaartjes twee teal-getinte kaartjes:
- "Papendrecht Vastgoed BV" — badge "OPNAME" — 7 regels — 18 mei 2026 — J. de Vries
- "Eelke Dollee" — badge "OPNAME" — 4 regels — 21 mei 2026 — R. Bakker
- Teller in kolomheader = (aantal projecten) + 2

- [ ] **Stap 3: DoordrukkenWizard openen**

Klik op een opname-kaartje. Verwacht:
- Wizard opent met donkere overlay
- Opname-samenvatting boven in het blauw-groene blok: klant, datum, inmeter, regelaantal
- Werksoort "Keukenbladen" voor-geselecteerd (teal rand)
- Projectnaam: "{klant} — Keukenbladen"
- Klant: grijs readonly veld
- Startdatum: voor-gevuld met meetdatum

- [ ] **Stap 4: Escape en backdrop sluiten**

Druk Escape → wizard sluit. Klik buiten modal → wizard sluit.

- [ ] **Stap 5: Validatie**

Wis de projectnaam, klik "Aanmaken als project" → rode foutmelding "— verplicht veld" bij het veld. Geen network-call.

- [ ] **Stap 6: Doordrukken**

Vul projectnaam in en klik "Aanmaken als project":
- Knop toont laadindicator "Aanmaken..."
- Na succes: wizard sluit, het desbetreffende opname-kaartje verdwijnt, projectdetailpaneel opent voor het nieuwe project, project staat in Lead-kolom

- [ ] **Stap 7: Console-controle**

Geen rode fouten in de browser-console bij alle bovenstaande acties.

- [ ] **Stap 8: Final commit**

```bash
git add -A
git commit -m "feat(doordrukken): opname-kaartjes en doordrukken-wizard volledig werkend"
```

---

## Samenvatting

| Bestand | Type | Omvang |
|---------|------|--------|
| `src/i18n/nl.json` | +22 regels | Vertalingen |
| `src/data/detail-types.ts` | +10 regels | `UnlinkedQuotation` type |
| `src/data/quotations-service.ts` | nieuw, 10 regels | Service-interface |
| `src/data/quotations-service-erpnext.ts` | nieuw, ~50 regels | ERPNext fetch + link |
| `src/data/quotations-service-mock.ts` | nieuw, ~40 regels | Mock-data |
| `src/data/index.ts` | ~+6 regels | Export quotationsService |
| `src/hooks/use-unlinked-quotations.ts` | nieuw, ~45 regels | React hook |
| `src/components/kanban/OpnameCard.tsx` | nieuw, ~80 regels | Opname-kaartje |
| `src/components/kanban/KanbanColumn.tsx` | vervang (~+15 regels) | Opname-props + render |
| `src/components/kanban/KanbanBoard.tsx` | ~+12 regels | Doorsturen opnames |
| `src/components/projects/DoordrukkenWizard.tsx` | nieuw, ~155 regels | Modal |
| `src/pages/ProjectsPage.tsx` | ~+20 regels | Wiring |

**Totaal:** 12 bestanden, ~465 regels. Geen nieuwe dependencies.
