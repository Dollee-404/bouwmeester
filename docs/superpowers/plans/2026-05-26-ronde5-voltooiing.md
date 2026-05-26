# RONDE 5 Voltooiing — 5G / 5I / 5J Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voltooi RONDE 5 met werksoort-specifieke StatusFlow-pijplijnen (5G), KPI-label-overrides per werksoort (5I), en responsive/polish fixes (5J).

**Architecture:** `werksoort-config.ts` is de enige bron van werksoort-specifieke configuratie. StatusFlow en KPIBlocks lezen hun layout uit deze config; ontbrekende configuratie valt transparant terug op standaardgedrag. Geen nieuwe ERPNext-velden, geen nieuwe custom fields.

**Tech Stack:** React 19, TypeScript 5, Tailwind CSS 4, i18next, Vite 8. Verificatie via `npm run build` (bevat `tsc -b`). Geen test-framework — visuele verificatie na elke commit.

---

## Bestandsstructuur

| Bestand | Wijziging |
|---------|-----------|
| `src/data/werksoort-config.ts` | Nieuwe `StatusFlowStep` + `KpiLabelOverrides` types; vul `statusFlow` en `kpiSet` voor Sloop en Sanering |
| `src/components/detail/StatusFlow.tsx` | Accepteer optionele `werksoort` prop; leid flow af uit werksoort-config |
| `src/components/detail/PanelHeader.tsx` | Geef `werksoort` door aan `<StatusFlow>` |
| `src/components/detail/DetailPanel.tsx` | Lees `kpiSet` uit werksoort-config voor KPI-label-overrides |
| `src/components/projects/NewProjectWizard.tsx` | Responsive werksoort-grid: `grid-cols-2 sm:grid-cols-4` |
| `README.md` | Document werksoort-config-systeem, migratie, deprecation |

---

## Task 1: Types + data in werksoort-config.ts (5G + 5I data)

**Files:**
- Modify: `src/data/werksoort-config.ts`

### Doel
Voeg `StatusFlowStep` en `KpiLabelOverrides` interfaces toe. Verander de bestaande stub-types (`readonly string[]`) naar de correcte types. Vul `statusFlow` voor Sloop en Sanering, en `kpiSet` voor beide.

**Ontwerpkeuze — beperking t.o.v. spec:**
De spec beschrijft Sanering als 7-staps-flow (`Onderzoek → Calculatie → Sanering → Vrijgave`). Dat vereist nieuwe ERPNext-statuswaarden, wat buiten scope van RONDE 5 valt. De implementatie hernoemt in plaats daarvan bestaande statusstappen (bijv. `Calculatie` → label `"Onderzoek"`). Dit is gedocumenteerd als known limitation in README (Task 5).

- [ ] **Stap 1: Open het bestand**

Lees `src/data/werksoort-config.ts` volledig.

- [ ] **Stap 2: Vervang de twee stub-types en voeg interfaces toe**

Vervang regels 1–30 door:

```typescript
import type { BouwmeesterStatus } from "./types";

export type WerksoortId = "Nieuwbouw" | "Renovatie" | "Verbouw" | "Sloop" | "Sanering" | "Keukenbladen" | "Onderhoud" | "Anders";

export const WERKSOORT_IDS: readonly WerksoortId[] = [
  "Nieuwbouw",
  "Renovatie",
  "Verbouw",
  "Sloop",
  "Sanering",
  "Keukenbladen",
  "Onderhoud",
  "Anders",
];

export interface WerksoortColor {
  readonly deep: string;
  readonly light: string;
}

/** Één stap in de werksoort-specifieke StatusFlow-pijplijn. */
export interface StatusFlowStep {
  /** Echte ERPNext-statuswaarde — gebruikt voor voortgangsberekening. */
  status: BouwmeesterStatus;
  /** Optioneel afwijkend weergavelabel voor deze werksoort (bijv. "Uitvoering" voor Sloop). */
  label?: string;
}

/** Optionele werksoort-specifieke labels voor de vier KPI-blokken. */
export interface KpiLabelOverrides {
  voortgang?: string;
  budget?: string;
  uren?: string;
  planning?: string;
}

export interface WerksoortConfig {
  readonly id: WerksoortId | null;
  readonly label: string;
  // 5F: primaire identiteitskleur — badge, card-accenten
  primaryColor?: WerksoortColor;
  // 5E: kleurpalet — één hex per fase
  palet?: readonly string[];
  // 5G: StatusFlow-pijplijn — undefined = gebruik standaard STATUS_ORDER
  statusFlow?: readonly StatusFlowStep[];
  // 5I: KPI-label-overrides — undefined = gebruik standaard i18n labels
  kpiSet?: KpiLabelOverrides;
}
```

- [ ] **Stap 3: Voeg Sloop- en Sanering-configuratie toe**

Vervang in `WERKSOORT_CONFIGS` de twee regels voor `Sloop` en `Sanering` door:

```typescript
  Sloop: {
    id: "Sloop",
    label: "Sloop",
    primaryColor: { deep: "#787060", light: "#DDDBD7" },
    statusFlow: [
      { status: "Lead" },
      { status: "Calculatie" },
      { status: "Gegund" },
      { status: "In uitvoering", label: "Uitvoering" },
      { status: "Afgerond" },
    ],
    kpiSet: { voortgang: "Afvoer %" },
  },
  Sanering: {
    id: "Sanering",
    label: "Sanering",
    primaryColor: { deep: "#3D6B9E", light: "#CFDAE7" },
    statusFlow: [
      { status: "Lead" },
      { status: "Calculatie", label: "Onderzoek" },
      { status: "Gegund" },
      { status: "In uitvoering", label: "Sanering" },
      { status: "Oplevering", label: "Vrijgave" },
      { status: "Afgerond" },
    ],
    kpiSet: { voortgang: "Materiaal (m³)" },
  },
```

- [ ] **Stap 4: Controleer dat de build slaagt**

```bash
cd /home/eelke/Documenten/Github/Y-App/bouwmeester
npm run build
```

Verwacht: `✓ built in ...ms` — geen TypeScript-fouten. Als `readonly string[]` nog ergens gelezen wordt zonder type-update, fix die plek eerst.

- [ ] **Stap 5: Commit**

```bash
git add src/data/werksoort-config.ts
git commit -m "ronde 5g+5i: StatusFlowStep + KpiLabelOverrides types, vul Sloop + Sanering"
```

---

## Task 2: StatusFlow.tsx — werksoort-prop + variabele flow (5G component)

**Files:**
- Modify: `src/components/detail/StatusFlow.tsx`

### Doel
Accepteer een optionele `werksoort` prop. Leid de flow af uit `werksoort-config.ts`. Render de flow ongeacht het aantal stappen (5, 6 of 7) zonder visueel kapotgaan.

- [ ] **Stap 1: Lees het bestand**

Lees `src/components/detail/StatusFlow.tsx` volledig (64 regels).

- [ ] **Stap 2: Vervang de volledige bestandsinhoud**

```typescript
import { Fragment } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BouwmeesterStatus } from "../../data/types";
import type { Werksoort } from "../../data/types";
import { STATUS_ORDER, STATUS_LABEL_KEYS } from "../kanban/status-config";
import { getWerksoortConfig } from "../../data/werksoort-config";

interface StatusFlowProps {
  currentStatus: BouwmeesterStatus;
  werksoort?: Werksoort | null;
}

export function StatusFlow({ currentStatus, werksoort }: StatusFlowProps) {
  const { t } = useTranslation();

  const config = getWerksoortConfig(werksoort);
  const flow = config.statusFlow
    ? config.statusFlow
    : STATUS_ORDER.map((status) => ({ status }));

  // Verloren/Geannuleerd zijn niet in de flow → currentIdx = -1 → alle stappen grijs
  const currentIdx = flow.findIndex((step) => step.status === currentStatus);

  return (
    <div className="flex items-start" aria-label="Projectstatus">
      {flow.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const label = step.label ?? t(STATUS_LABEL_KEYS[step.status]);

        return (
          <Fragment key={`${step.status}-${idx}`}>
            {idx > 0 && (
              <div
                className={`flex-1 h-0.5 mt-3 ${idx <= currentIdx ? "bg-y-teal" : "bg-slate-200"}`}
                aria-hidden="true"
              />
            )}

            <div className="flex flex-col items-center shrink-0">
              <div
                className={[
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold",
                  isDone    ? "bg-y-teal text-white" : "",
                  isCurrent ? "bg-y-teal text-white ring-2 ring-y-teal/25 ring-offset-1" : "",
                  !isDone && !isCurrent ? "bg-slate-100 text-slate-400" : "",
                ].join(" ")}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isDone
                  ? <Check size={11} strokeWidth={2.5} aria-hidden="true" />
                  : idx + 1
                }
              </div>
              <span
                className={[
                  "mt-1 text-[9px] leading-tight text-center max-w-[54px]",
                  isDone || isCurrent ? "text-slate-700 font-medium" : "text-slate-400",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
```

**Let op:** De key is `${step.status}-${idx}` in plaats van enkel `step.status`, omdat twee stappen in theorie dezelfde statuswaarde kunnen krijgen bij uitbreiding.

- [ ] **Stap 3: Controleer dat de build slaagt**

```bash
npm run build
```

Verwacht: geen fouten. PanelHeader klaagt niet over ontbrekende `werksoort`-prop omdat het een optioneel veld is.

- [ ] **Stap 4: Commit**

```bash
git add src/components/detail/StatusFlow.tsx
git commit -m "ronde 5g: StatusFlow accepteert werksoort-prop en variabele flow"
```

---

## Task 3: PanelHeader.tsx — werksoort doorgeven aan StatusFlow (5G wiring)

**Files:**
- Modify: `src/components/detail/PanelHeader.tsx`

### Doel
Geef `detail.werksoort` door aan `<StatusFlow>` zodat de pijplijn per werksoort zichtbaar wordt in de paneel-header.

- [ ] **Stap 1: Lees het bestand**

Lees `src/components/detail/PanelHeader.tsx` volledig (99 regels).

- [ ] **Stap 2: Pas de StatusFlow-aanroep aan**

Zoek op regel 85:

```tsx
        <StatusFlow currentStatus={detail.status} />
```

Vervang door:

```tsx
        <StatusFlow currentStatus={detail.status} werksoort={detail.werksoort} />
```

- [ ] **Stap 3: Controleer dat de build slaagt**

```bash
npm run build
```

Verwacht: geen fouten, geen TypeScript-warnings.

- [ ] **Stap 4: Commit**

```bash
git add src/components/detail/PanelHeader.tsx
git commit -m "ronde 5g: PanelHeader geeft werksoort door aan StatusFlow"
```

**STOP: Eelke bekijkt de paneel-header voor een Sloop-project (5 stappen) en een Sanering-project (6 stappen met hernoemde labels) op minimaal twee viewport-breedtes.**

---

## Task 4: DetailPanel.tsx — KPI-label-overrides per werksoort (5I)

**Files:**
- Modify: `src/components/detail/DetailPanel.tsx`

### Doel
Lees `kpiSet` uit `werksoort-config` en gebruik de overrides als labels voor de vier KPI-blokken. Projecten zonder kpiSet-configuratie krijgen de standaard i18n-labels.

- [ ] **Stap 1: Lees de relevante delen van het bestand**

Lees `src/components/detail/DetailPanel.tsx` regels 1–20 (imports) en regels 195–220 (KPI-strook + omgeving).

- [ ] **Stap 2: Voeg import toe**

Zoek de bestaande importregel:

```typescript
import { KPIBlock } from "./KPIBlock";
```

Vervang door:

```typescript
import { KPIBlock } from "./KPIBlock";
import { getWerksoortConfig } from "../../data/werksoort-config";
```

- [ ] **Stap 3: Voeg kpiLabels-berekening toe**

Zoek in de component-body de regel `const body = (`. Voeg direct daarvóór in:

```typescript
  const ws = detail ? getWerksoortConfig(detail.werksoort) : null;
  const kpiLabels = {
    voortgang: ws?.kpiSet?.voortgang ?? t("kpi.voortgang"),
    budget:    ws?.kpiSet?.budget    ?? t("kpi.budget"),
    uren:      ws?.kpiSet?.uren      ?? t("kpi.uren"),
    planning:  ws?.kpiSet?.planning  ?? t("kpi.planning"),
  };
```

- [ ] **Stap 4: Gebruik kpiLabels in de KPI-strook**

Zoek de vier `<KPIBlock>` aanroepen (momenteel met `t("kpi.*")`):

```tsx
              <KPIBlock {...calcVoortgangKPI(detail!, t("kpi.voortgang"))} />
              <KPIBlock {...calcBudgetKPI(detail!, t("kpi.budget"))} />
              <KPIBlock {...calcUrenKPI(detail!, timesheets ?? {}, t("kpi.uren"))} />
              <KPIBlock {...calcPlanningKPI(detail!, t("kpi.planning"))} />
```

Vervang door:

```tsx
              <KPIBlock {...calcVoortgangKPI(detail!, kpiLabels.voortgang)} />
              <KPIBlock {...calcBudgetKPI(detail!, kpiLabels.budget)} />
              <KPIBlock {...calcUrenKPI(detail!, timesheets ?? {}, kpiLabels.uren)} />
              <KPIBlock {...calcPlanningKPI(detail!, kpiLabels.planning)} />
```

- [ ] **Stap 5: Controleer dat de build slaagt**

```bash
npm run build
```

Verwacht: geen fouten.

- [ ] **Stap 6: Commit**

```bash
git add src/components/detail/DetailPanel.tsx
git commit -m "ronde 5i: KPI-labels per werksoort via kpiSet in werksoort-config"
```

**STOP: Eelke opent een Sloop-project en ziet de Voortgang-KPI met label "Afvoer %". Eelke opent een Sanering-project en ziet "Materiaal (m³)". Eelke opent een Renovatie-project en ziet de standaard labels.**

---

## Task 5: 5J Polish — responsive wizard + README

**Files:**
- Modify: `src/components/projects/NewProjectWizard.tsx`
- Modify: `README.md`

### Doel
Fix de werksoort-knoppenrij (momenteel altijd 4 kolommen, te krap op mobiel). Update de README met de werksoort-config-architectuur, de `custom_werksoort`-deprecation en instructies voor toevoegen van een eigen Project Type.

**Controle: ESC + klik-buiten zijn al geïmplementeerd** in `NewProjectWizard.tsx` (regels 42–48 en 118). Geen actie nodig.

- [ ] **Stap 1: Fix responsive werksoort-grid**

Lees `src/components/projects/NewProjectWizard.tsx` regel 154.

Zoek:

```tsx
            <div className="grid grid-cols-4 gap-2">
```

Vervang door:

```tsx
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
```

- [ ] **Stap 2: Controleer dat de build slaagt**

```bash
npm run build
```

Verwacht: geen fouten.

- [ ] **Stap 3: Commit responsive fix**

```bash
git add src/components/projects/NewProjectWizard.tsx
git commit -m "ronde 5j: responsive werksoort-grid in aanmaak-wizard"
```

- [ ] **Stap 4: Update README**

Lees `README.md` volledig.

Voeg **na de bestaande `## Custom fields` sectie en vóór `## Known limitations`** een nieuwe sectie toe:

```markdown
## Werksoort-configuratie

Bouwmeester kent acht werksoorten: Nieuwbouw, Renovatie, Verbouw, Sloop, Sanering, Keukenbladen, Onderhoud en Anders. De configuratie per werksoort staat in `src/data/werksoort-config.ts` en bevat:

- **`primaryColor`** — badge- en accentkleur (hex deep + light)
- **`palet`** — kleurarray voor Gantt-fasebalken
- **`statusFlow`** — werksoort-specifieke pijplijn als `StatusFlowStep[]`. Elke stap verwijst naar een echte `BouwmeesterStatus`-waarde en heeft een optioneel afwijkend weergavelabel. `undefined` = standaard 6-staps-flow (Lead → Calculatie → Gegund → In uitvoering → Oplevering → Afgerond).
- **`kpiSet`** — optionele labeloverrides voor de vier KPI-blokken (Voortgang, Budget, Uren, Planning). `undefined` = standaard i18n-labels.

**Voorbeeld:** Sloop heeft een 5-staps-flow (geen Oplevering) en hernoemt "In uitvoering" naar "Uitvoering" op de statusbalk. De KPI "Voortgang" toont voor Sloop het label "Afvoer %".

### custom_werksoort — deprecation

Het veld `custom_werksoort` (eigen Select-veld op Project) is deprecated per RONDE 5C. Bouwmeester leest de werksoort nu uit het standaard ERPNext-veld `project_type` (via `Project Type`-doctype). `custom_werksoort` blijft als read-only fallback aanwezig totdat alle installaties zijn gemigreerd. Schrijf nooit naar `custom_werksoort` in nieuwe code.

### Project Type toevoegen in ERPNext

1. Open in ERPNext: **Project → Project Type → Nieuw**
2. Vul de naam in exact zoals hij in Bouwmeester moet verschijnen (bijv. "Restauratie")
3. Sla op
4. Voeg indien gewenst een `Project Template` toe voor automatische fase-aanmaak

Bouwmeester herkent de nieuwe werksoort als `WerksoortId` alleen als je de naam ook toevoegt aan `WERKSOORT_IDS` en `WERKSOORT_CONFIGS` in `src/data/werksoort-config.ts`. Zonder die toevoeging valt Bouwmeester terug op de neutrale `DEFAULT_CONFIG` (grijs badge, standaard StatusFlow).
```

Voeg ook een nieuw punt toe **onderaan** de bestaande `## Known limitations` sectie:

```markdown
6. **Sanering StatusFlow is vereenvoudigd tot 6 stappen.** De ideale flow (Aanvraag → Onderzoek → Calculatie → Gegund → Sanering → Vrijgave → Afgerond, 7 stappen) vereist twee nieuwe ERPNext-statuswaarden. De huidige implementatie hernoemt bestaande statussen: "Calculatie" verschijnt als "Onderzoek", "In uitvoering" als "Sanering", "Oplevering" als "Vrijgave". Een volledige 7-staps-flow is gepland voor een latere ronde na ERPNext-schema-uitbreiding.
```

- [ ] **Stap 5: Controleer dat de build slaagt**

```bash
npm run build
```

Verwacht: geen fouten.

- [ ] **Stap 6: Commit README**

```bash
git add README.md
git commit -m "ronde 5j: README werksoort-config-architectuur, deprecation, known limitations"
```

**STOP: Eelke leest de nieuwe README-sectie en beslist over Pull Request en merge naar main.**

---

## Spec coverage controle

| Spec-item | Taak |
|-----------|------|
| 5G: StatusFlow-pijplijn per werksoort als ordered array in werksoort-config | Task 1 + Task 2 |
| 5G: Sloop 5 stappen (geen Oplevering) | Task 1 |
| 5G: Sanering 6 stappen met hernoemde labels | Task 1 |
| 5G: StatusFlow variabele lengte (5/6/7) zonder visueel kapotgaan | Task 2 |
| 5G: Default voor onbekende werksoort = standaard 6 stappen | Task 2 (getWerksoortConfig geeft DEFAULT_CONFIG → statusFlow undefined → fallback naar STATUS_ORDER) |
| 5G: werksoort doorgeven via PanelHeader | Task 3 |
| 5I: 4 KPI-blokken blijven default | Task 4 (kpiLabels valt terug op t("kpi.*") als kpiSet undefined) |
| 5I: Sanering Voortgang-label = "Materiaal (m³)" | Task 1 + Task 4 |
| 5I: Sloop Voortgang-label = "Afvoer %" | Task 1 + Task 4 |
| 5J: Responsive wizard | Task 5 stap 1 |
| 5J: ESC sluit wizard | Al geïmplementeerd (NewProjectWizard.tsx regels 42–48) |
| 5J: Klik-buiten sluit wizard | Al geïmplementeerd (NewProjectWizard.tsx regel 118) |
| 5J: i18n nieuwe strings | KPI-overrides zijn hardcoded NL-strings in werksoort-config.ts — geen i18n-keys nodig zolang de app NL-only is |
| 5J: Edge case project zonder werksoort | getWerksoortConfig(null) → DEFAULT_CONFIG → statusFlow undefined → fallback. Gedekt. |
| 5J: Edge case onbekende werksoort | getWerksoortConfig("Onbekend") → DEFAULT_CONFIG. Gedekt. |
| 5J: README werksoort-architectuur | Task 5 stap 4 |
| 5J: README migratie custom_werksoort | Task 5 stap 4 |
| 5J: README Project Type toevoegen | Task 5 stap 4 |
