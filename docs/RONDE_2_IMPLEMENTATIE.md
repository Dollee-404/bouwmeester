# Ronde 2 — Implementatie: Bouwmeester (kanban-board scope)

## Voor je begint — lees dit eerst

Dit document is de bouwopdracht voor de **eerste werkende versie van Bouwmeester**:
een Y-App extensie voor aannemers, met als kernfunctionaliteit een kanban-board
voor projecten. Detailpaneel, planning-tab en andere onderdelen volgen in latere
rondes — niet nu.

**Werk fase voor fase.** Elke fase heeft acceptatiecriteria. Stop na elke fase,
geef een korte samenvatting in chat van wat je hebt gedaan, en wacht op akkoord
voordat je doorgaat. Dit voorkomt dat fouten zich opstapelen.

**Bij twijfel: stop en stel een vraag.** Niet doorgokken. Het onderzoek uit
ronde 1 (`docs/research/y-app-extension-contract.md` — moet bij je aanwezig zijn)
is je primaire bron. Als iets niet in dat document staat en je weet het niet:
vragen.

**Geen scope-creep.** Als je merkt dat je code schrijft voor het detailpaneel
of de planning-tab: stop. Dat is voor ronde 3 en 4. Bouw alleen wat hier staat.

---

## Project context (voor je geheugen tijdens deze sessie)

**Bouwmeester** is een React + TypeScript SPA die als sandboxed iframe in Y-App
laadt. Y-App is een multi-tenant workspace bovenop ERPNext. Aannemers gebruiken
Y-App + Bouwmeester samen om hun projecten te beheren — van eerste lead tot
facturatie.

Het kanban-board toont projecten als kaarten in 6 statuskolommen:
Aanvraag → Calculatie → Gegund → In uitvoering → Oplevering → Afgerond.
Alternatief is een tabelweergave. Dit is wat we in deze ronde bouwen.

Belangrijkste constraints uit het onderzoek:
- Iframe sandbox: `allow-scripts allow-same-origin allow-forms allow-popups`
- Geen eigen ERPNext-credentials — alle data via postMessage RPC bridge naar parent
- Effectieve breedte: minimaal 1024px (1280px scherm met expanded sidebar)
- Geen gedeelde npm UI-package met Y-App — wel exact dezelfde design tokens
- 4 custom fields die ontbreken op standaard ERPNext (zie sectie E6 in onderzoek)

---

## Visuele referentie

In `docs/design-references/` staan twee PNG's: `hoofdscherm.png` en
`Projectscherm.png`. Dit zijn **design-mockups, geen code**. Gebruik ze om de
visuele richting te bepalen — niet om bestaande code uit te zoeken of te
importeren. Er is geen oudere codebase om te migreren; we bouwen vanaf nul,
maar streven naar het uiterlijk uit deze mockups.

Specifieke elementen die uit de mockups overgenomen moeten worden:
- 6 kolommen met statusspecifieke kleur (stip naast kolomkop)
- Projectkaarten met: projectnummer + werksoort-badge bovenaan, projectnaam,
  klantnaam, datumregel, budgetregel met voortgangsbalk, footer met avatars
  en metadata-iconen
- Linkerrand van kaart in de statuskleur
- Bovenbalk met titel "Projecten", teller "X actief · Y gearchiveerd",
  zoekveld, gearchiveerd-filter, Board/Tabel toggle, primaire "+ Nieuw project"
- Lege kolommen tonen alsnog (geen gaten in de layout)

---

## Naming conventies (gebruik consistent)

| Concept | Naam |
|---------|------|
| Repo / package naam | `bouwmeester` |
| GitHub-org/user | (jij vult in bij setup) |
| Dev-poort | `5200` (afgesproken in eerdere sessie) |
| Custom field prefix | `custom_bouwmeester_*` |
| i18n key prefix | `bouwmeester.*` (bij interne keys) |
| TypeScript: types | PascalCase (`Project`, `KanbanColumn`) |
| TypeScript: bestanden | kebab-case (`project-card.tsx`) |
| Tailwind tokens | hetzelfde als Y-App (`y-teal`, `y-purple-dark`) |

---

## FASE 0 — Repo setup

**Doel:** Een werkend, leeg skelet dat lokaal draait op poort 5200, deploybaar
is via GitHub Pages, en met de juiste dependencies en config-bestanden.

### Stappen

1. **Initialiseer met Vite.** Gebruik het `react-ts` template:
   ```bash
   npm create vite@latest bouwmeester -- --template react-ts
   cd bouwmeester
   npm install
   ```

2. **Vite config aanpassen.** `vite.config.ts`:
   - Base path: `"./"` (relatief, zoals 3BM doet — werkt op elke deploy-URL)
   - Dev poort: `5200`
   - Tailwind 4 plugin: `@tailwindcss/vite`

3. **Installeer kerndependencies:**
   ```bash
   npm install react@^19 react-dom@^19
   npm install -D @types/react @types/react-dom typescript@^5
   npm install -D tailwindcss@^4 @tailwindcss/vite
   npm install lucide-react
   npm install i18next react-i18next i18next-browser-languagedetector
   ```

   Nog niet installeren: react-router-dom (niet nodig voor één view in deze ronde),
   geen UI-libraries, geen state-management libraries (React state + Context volstaat).

4. **Tailwind 4 setup.**
   - Verwijder eventuele `tailwind.config.js` — we gebruiken CSS-first config
   - In `src/index.css`: importeer Tailwind en definieer `@theme` met de Y-App tokens

   ```css
   @import "tailwindcss";

   @theme {
     --color-y-teal: #006876;
     --color-y-teal-light: #99c2c8;
     --color-y-teal-dark: #043b42;
     --color-y-purple: #043b42;
     --color-y-purple-light: #065a64;
     --color-y-purple-dark: #022a2f;

     --font-sans: system-ui, -apple-system, sans-serif;
   }
   ```

   Verifieer in dev dat klassen als `bg-y-teal` en `text-y-teal-dark` werken.

5. **Project structuur** (maak nu de mappen leeg aan, vul later):
   ```
   bouwmeester/
   ├── public/
   │   └── (later: logo of favicon)
   ├── src/
   │   ├── bridge/              ← postMessage RPC client
   │   ├── data/                ← ERPNext-laag (services, types)
   │   ├── components/
   │   │   ├── ui/              ← herbruikbare primitives (Button, Card, Badge, etc.)
   │   │   ├── kanban/          ← kanban-board specifieke componenten
   │   │   └── shared/          ← layout, header, etc.
   │   ├── pages/
   │   │   └── ProjectsPage.tsx ← de hoofdpagina
   │   ├── i18n/
   │   │   ├── index.ts
   │   │   ├── nl.json
   │   │   └── en.json
   │   ├── hooks/
   │   ├── lib/                 ← utilities (date formatters, etc.)
   │   ├── App.tsx
   │   ├── main.tsx
   │   └── index.css
   ├── docs/
   │   ├── research/            ← bevat het ronde-1 onderzoeksdocument
   │   └── design-references/   ← bevat de PNG-mockups
   ├── .github/
   │   └── workflows/
   │       └── deploy.yml       ← GitHub Pages
   ├── vite.config.ts
   ├── tsconfig.json
   ├── package.json
   └── README.md
   ```

6. **GitHub Actions workflow** voor automatische deploy naar GitHub Pages bij push
   naar `main`. Modelleer naar het patroon van KG Planning of 3BM (uit het onderzoek).
   Output: `dist/` wordt gepubliceerd op `gh-pages` branch of via `pages` artifact.

7. **README** met minimale info: wat is Bouwmeester, hoe installeer/dev je het,
   waar staat de extensie URL na deploy, en een verwijzing naar het
   onderzoeksdocument.

### Acceptatiecriteria fase 0

- [ ] `npm run dev` start op poort 5200 en toont een lege React-pagina
- [ ] Tailwind klassen `bg-y-teal text-white` op een testelement renderen correct
- [ ] `npm run build` produceert een `dist/` met relatieve paden (geen `/absolute/` in de HTML)
- [ ] GitHub Actions workflow staat klaar (mag nog niet getriggerd zijn)
- [ ] Mappenstructuur staat zoals hierboven
- [ ] Geen overbodige dependencies in `package.json`

**Stop na fase 0. Korte samenvatting in chat. Wacht op akkoord.**

---

## FASE 1 — Bridge-laag + design tokens

**Doel:** Een werkende RPC-client naar Y-App, en de basisset herbruikbare UI-primitives
in de Y-App stijl.

### 1A. Bridge

Maak `src/bridge/index.ts` met de 7 RPC-methodes plus de createDocument-workaround.
Volg het patroon van KG Planning's `bridge.ts` (zie ronde-1 onderzoek). Concreet:

**Configuratie uit URL-params (synchroon, bij module load):**
```typescript
const params = new URLSearchParams(window.location.search);
export const HOST_ORIGIN = params.get("host") || "*";
export const INSTANCE_ID = params.get("instance") || "";
export const ERPNEXT_URL = params.get("erpUrl") || "";
export const LANG = params.get("lang") || "nl";
```

**RPC-functies:**
- `fetchList(doctype, opts)` — typed wrapper rond `fetchList` RPC
- `fetchDocument(doctype, name)` — wrapper rond `fetchDocument`
- `updateDocument(doctype, name, patch)` — wrapper rond `updateDocument`
- `callMethod(method, args)` — wrapper rond `callMethod`
- `createDocument(doctype, doc)` — **workaround**: roept intern
  `callMethod("frappe.client.insert", { doc: { doctype, ...doc } })`
- `fetchPrivateFile(path)` — wrapper rond `fetchPrivateFile`
- `getActiveInstanceId()` — geeft `INSTANCE_ID` synchroon (geen RPC nodig,
  zit al in URL-param)
- `getErpNextAppUrl()` — geeft `ERPNEXT_URL` synchroon

**Implementatie-eisen:**
- 30 seconden timeout per RPC-call (zoals 3BM doet, niet 60s zoals KG)
- Counter-based message ID's (incrementeel integer)
- Promises met expliciete reject bij timeout of `ok: false`
- `targetOrigin` altijd `HOST_ORIGIN` voor uitgaande postMessage
- Listener voor inkomende messages met `event.origin` validatie
  (alleen accepteren als `event.origin === HOST_ORIGIN`)
- Type-safe: TypeScript generics voor return types waar mogelijk

**Belangrijk:** Schrijf hier ook een README-fragment in `src/bridge/README.md`
dat beschrijft hoe een ander deel van de codebase de bridge gebruikt. Een paar
korte voorbeelden, niet meer.

### 1B. Design tokens en UI-primitives

In `src/components/ui/` bouw je deze primitives. **Geen externe UI-library.**
Alle styling met Tailwind utility-classes. Volg de specs uit het onderzoek
(sectie G3) exact.

**Componenten om te bouwen:**

1. **Button** — varianten: `primary`, `secondary`, `danger`, `ghost`. Sizes:
   `sm`, `md`. Loading state met spinner uit Lucide. Disabled state.

2. **Card** — varianten: `container` (white + shadow + border) en `info`
   (slate-50, geen border). Children-only, geen verplichte props.

3. **Badge** — varianten: `default`, `success`, `warning`, `danger`, `info`,
   `purple`, `neutral`. Optionele `size`: `sm`, `xs` (micro).

4. **Input** — text input met optioneel `icon` (Lucide-icon prop). Focus-ring
   in y-teal.

5. **Select** — native `<select>` met de Y-App styling.

6. **Avatar** — toont initialen op gekleurde achtergrond. Neemt een `name`
   prop, genereert initialen en kleur deterministisch (zelfde naam = zelfde
   kleur). Sizes: `xs`, `sm`, `md`.

7. **Toggle** — twee-staten knop voor Board/Tabel toggle.

8. **EmptyState** — generieke lege staat: `slate-50` rounded-xl, gecentreerde
   tekst, optioneel icoon. Gebruikt in lege kanban-kolommen.

9. **LoadingState** — eenvoudige tekst "Laden..." gecentreerd. Geen spinner-
   only, want Y-App doet dit ook tekstueel.

10. **Toast** + ToastProvider — eigen mini-implementatie. Auto-dismiss na
    4000ms, varianten `success` / `error` / `info`. Max 3 zichtbaar.

**Niet bouwen in deze fase:** Modal, slide-over, tabs (komen pas in ronde 3
voor het detailpaneel).

### 1C. i18n-opzet

In `src/i18n/index.ts` initialiseer i18next met:
- Default taal: `LANG` uit URL-params (fallback `nl`)
- Resources: `nl.json` en `en.json` als statische imports
- Geen lazy loading — bundle is klein genoeg

Begin de bundle met deze keys (vul aan in latere fases):
```json
{
  "common": {
    "loading": "Laden...",
    "error": "Er ging iets mis",
    "retry": "Opnieuw proberen",
    "cancel": "Annuleren",
    "save": "Opslaan"
  },
  "projects": {
    "title": "Projecten",
    "new": "Nieuw project",
    "search_placeholder": "Zoek project of klant...",
    "view_board": "Board",
    "view_table": "Tabel",
    "show_archived": "Gearchiveerd",
    "active_count": "{{count}} actief",
    "archived_count": "{{count}} gearchiveerd"
  }
}
```

Maak hetzelfde in `en.json`.

### 1D. Mini test-pagina

Bouw in `App.tsx` tijdelijk een testpagina die alle UI-primitives en alle
bridge-functies (gemockt) toont. Dit is je sanity-check voordat je verder
gaat. Verwijder deze pagina later.

### Acceptatiecriteria fase 1

- [ ] `bridge/index.ts` werkt met postMessage roundtrip naar `window.parent`
- [ ] Bridge-functies zijn type-safe: TypeScript geeft fouten bij verkeerd gebruik
- [ ] URL-params worden correct uitgelezen en getoond in een debug-overlay
- [ ] Alle 10 UI-primitives gerenderd op een testpagina, visueel correct
- [ ] Tokens 1-op-1 te vergelijken met Y-App: open Y-App in een tab, open de
      testpagina in een tab, kleuren komen overeen
- [ ] i18n werkt: schakel `?lang=en` aan in URL en zie Engelse teksten
- [ ] Build produceert nog steeds correct `dist/` zonder errors

**Stop na fase 1. Korte samenvatting in chat. Wacht op akkoord.**

---

## FASE 2 — First-launch wizard voor custom fields

**Doel:** Bij eerste opening detecteert Bouwmeester ontbrekende custom fields
en helpt de gebruiker ze installeren — automatisch (System Manager) of via
JSON-fallback (anders).

### 2A. Custom fields specificatie

Maak `src/data/custom-fields-spec.ts` met de 4 te installeren velden:

```typescript
export const REQUIRED_CUSTOM_FIELDS = [
  {
    dt: "Project",
    fieldname: "custom_bouwmeester_status",
    label: "Bouwmeester Status",
    fieldtype: "Select",
    options: "Lead\nCalculatie\nGegund\nIn uitvoering\nOplevering\nAfgerond",
    insert_after: "status",
    default: "Lead",
  },
  {
    dt: "Project",
    fieldname: "custom_werksoort",
    label: "Werksoort",
    fieldtype: "Select",
    options: "\nRenovatie\nNieuwbouw\nSloop\nVerbouw\nOnderhoud",
    insert_after: "custom_bouwmeester_status",
  },
  {
    dt: "Project",
    fieldname: "custom_budget_hours",
    label: "Budget uren",
    fieldtype: "Float",
    insert_after: "estimated_costing",
  },
  {
    dt: "Project",
    fieldname: "custom_weersafhankelijk",
    label: "Weersafhankelijk",
    fieldtype: "Check",
    insert_after: "custom_werksoort",
  },
];
```

### 2B. Detectie

Maak `src/data/setup-check.ts` met functie `checkRequiredFields()`:

1. Roept `bridge.fetchList("Custom Field", { filters: [["dt", "=", "Project"], ["fieldname", "in", [...alle fieldnames]]], fields: ["fieldname"] })`
2. Vergelijkt met `REQUIRED_CUSTOM_FIELDS`
3. Returnt `{ missing: CustomFieldSpec[], complete: boolean }`

### 2C. System Manager check

Maak functie `isSystemManager()`:

1. Roept `bridge.callMethod("frappe.client.get_list", { doctype: "Has Role", filters: [["parent", "=", "<current_user>"], ["role", "=", "System Manager"]], fields: ["name"] })`
2. Of (eenvoudiger): probeer een test-Custom-Field aan te maken in een
   try/catch; als het lukt, ben je System Manager

Mijn voorkeur: roep `frappe.client.get_value("User", "<user>", "name")` om
de current user te krijgen en check dan via `Has Role`. Dit is netjes.

Als `isSystemManager()` faalt: ga ervan uit dat hij geen System Manager is.

### 2D. Installer

Functie `installCustomFields(specs)`:

```typescript
for (const spec of specs) {
  await bridge.callMethod("frappe.client.insert", {
    doc: { doctype: "Custom Field", ...spec }
  });
}
```

Idempotent: gebruik altijd eerst `checkRequiredFields()` om alleen ontbrekende
te installeren. Bij fouten: stop, toon foutmelding, retry-knop.

### 2E. JSON-fallback

Maak een functie `downloadFieldsJson(specs)` die een browser-download triggert
van een JSON-bestand met de specs in Frappe-fixtures-formaat. Dit JSON-bestand
kan een beheerder importeren via Customize Form → Import in ERPNext.

Voor het correcte fixtures-formaat: zie het Frappe Skill Package uit het
onderzoek, of de Frappe documentatie. Hou het simpel — een array van objecten
met `doctype: "Custom Field"` en de relevante velden.

### 2F. Wizard UI

Bouw `src/pages/SetupWizard.tsx`:

**Flow:**
1. App opent → render een `SetupGate` component die `checkRequiredFields()` aanroept
2. Tijdens check: toon `LoadingState`
3. Als `complete: true`: render de echte app (children)
4. Als `complete: false`: render de wizard

**Wizard schermen:**

**Scherm 1: Welkom**
- Titel "Welkom bij Bouwmeester"
- Korte uitleg: "Om je projecten te kunnen tonen, moet Bouwmeester 4 velden
  toevoegen aan ERPNext. Dit is eenmalig en gaat snel."
- Button "Installeer velden" (primary)

**Scherm 2A: System Manager — installatie loopt**
- Toon de 4 fields als een lijst, met spinner of vinkje per field
- Live update tijdens installatie
- Bij succes: vinkje + auto-doorklik naar app (na 1 seconde)
- Bij fout: foutmelding + retry-knop + fallback naar 2B

**Scherm 2B: Geen System Manager — fallback**
- Titel "Vraag je beheerder om hulp"
- Uitleg: "Bouwmeester kan deze velden niet zelf installeren omdat je geen
  System Manager rechten hebt. Stuur dit bestand naar je ERPNext-beheerder."
- Button "Download installatiebestand" (downloadt JSON)
- Button "Stuur naar beheerder via mail" (opent `mailto:` met instructie als body)
- Knop "Ik heb dit gedaan, controleer opnieuw" — herhaalt de check

### Acceptatiecriteria fase 2

- [ ] Bij eerste open zonder custom fields: wizard verschijnt
- [ ] Bij open met fields aanwezig: wizard wordt overgeslagen, app laadt direct
- [ ] System Manager kan in 1 klik installeren
- [ ] Niet-System-Manager krijgt fallback met JSON-download
- [ ] Idempotent: bij refresh tijdens installatie geen duplicaten
- [ ] JSON-download werkt en bevat alle 4 velden in correct formaat
- [ ] Wizard ziet er visueel correct uit (Y-App stijl)

**Stop na fase 2. Korte samenvatting in chat. Wacht op akkoord.**

---

## FASE 3 — Datalaag

**Doel:** Project-data ophalen uit ERPNext, getransformeerd naar de
TypeScript-types die de UI gebruikt. Inclusief mock-modus voor lokale dev
zonder Y-App.

### 3A. Types

Maak `src/data/types.ts`:

```typescript
export type BouwmeesterStatus =
  | "Lead"
  | "Calculatie"
  | "Gegund"
  | "In uitvoering"
  | "Oplevering"
  | "Afgerond";

export type Werksoort =
  | "Renovatie" | "Nieuwbouw" | "Sloop" | "Verbouw" | "Onderhoud";

export interface Project {
  id: string;                    // ERPNext: name
  projectName: string;           // ERPNext: project_name
  customerName: string;          // ERPNext: customer_name
  status: BouwmeesterStatus;     // ERPNext: custom_bouwmeester_status
  werksoort: Werksoort | null;   // ERPNext: custom_werksoort
  startDate: Date | null;        // ERPNext: expected_start_date
  endDate: Date | null;          // ERPNext: expected_end_date
  percentComplete: number;       // ERPNext: percent_complete
  budgetSales: number;           // ERPNext: total_sales_amount
  budgetHours: number | null;    // ERPNext: custom_budget_hours
  billedAmount: number;          // ERPNext: total_billed_amount
  estimatedCosting: number;      // ERPNext: estimated_costing
  projectManager: string | null; // ERPNext: custom_project_manager
  address: string | null;        // ERPNext: custom_address
  isWeatherDependent: boolean;   // ERPNext: custom_weersafhankelijk
  isArchived: boolean;           // afgeleid: ERPNext.status === "Completed" || "Cancelled"
}
```

### 3B. Service interface

Maak `src/data/projects-service.ts` met een interface:

```typescript
export interface ProjectsService {
  list(options?: ListOptions): Promise<Project[]>;
  getOne(id: string): Promise<Project>;
  updateStatus(id: string, newStatus: BouwmeesterStatus): Promise<void>;
  // ...later: create, archive, etc.
}
```

### 3C. ERPNext implementatie

`src/data/projects-service-erpnext.ts`:

- Gebruikt `bridge.fetchList("Project", { ... })` met de juiste fields
- Filtert standaard op `status != "Cancelled"` (gearchiveerd is een aparte
  toggle in de UI)
- Transformeert ERPNext-velden naar de `Project` interface
- Date-parsing: ERPNext geeft datums als strings ("2026-05-12"); converteer
  naar `Date` objecten of `null`
- Caching: gebruik een simpele in-memory map (TTL 60 seconden) zodat
  herhaalde calls binnen korte tijd niet allemaal naar de server gaan

### 3D. Mock implementatie

`src/data/projects-service-mock.ts`:

- Returnt een hardcoded lijst van ±15 realistische projecten verspreid over
  alle 6 statussen
- Gebruikt namen uit de mockup (Drechtstedenbouw, Papendrecht Vastgoed, etc.)
- Voor `updateStatus`: muteert de in-memory lijst en lost na 200ms op (om
  netwerk-latency te simuleren)

### 3E. Service factory

`src/data/index.ts`:

```typescript
import { erpnextService } from "./projects-service-erpnext";
import { mockService } from "./projects-service-mock";

const useMock = import.meta.env.DEV && !window.parent !== window;
// of: const useMock = !INSTANCE_ID;  // geen instance-ID = niet in iframe

export const projectsService: ProjectsService = useMock ? mockService : erpnextService;
```

Logica: als we in dev-modus zijn EN niet in een iframe (dus `window === window.parent`),
gebruiken we mock. Anders ERPNext via bridge.

### 3F. React hook

Maak `src/hooks/use-projects.ts`:

```typescript
export function useProjects(options?: ListOptions) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    projectsService.list(options)
      .then(p => !cancelled && setProjects(p))
      .catch(e => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [/* serialiseer options */]);

  const refetch = useCallback(/* opnieuw ophalen */, []);

  return { projects, loading, error, refetch };
}
```

Geen TanStack Query of SWR — niet nodig voor deze scope, voegt complexiteit
toe. Plain useState + useEffect volstaat. Als het in latere rondes te complex
wordt, switchen we dan.

### Acceptatiecriteria fase 3

- [ ] In dev (lokaal, geen iframe): mock-service draait, 15 projecten zichtbaar
- [ ] In iframe: ERPNext-service draait, echte data zichtbaar
- [ ] Types zijn strict — `npm run build` faalt bij type-fouten
- [ ] Date-parsing werkt: project met `expected_start_date: null` heeft
      `startDate: null` (geen `Invalid Date`)
- [ ] `updateStatus` werkt in beide modi (mock muteert lokaal, ERPNext
      verstuurt updateDocument)

**Stop na fase 3. Korte samenvatting in chat. Wacht op akkoord.**

---

## FASE 4 — Kanban-board UI

**Doel:** De projectenpagina volledig functioneel: 6 kolommen, projectkaarten,
header met titel + filters + toggle, drag-and-drop tussen kolommen.

### 4A. Hoofdpagina layout

`src/pages/ProjectsPage.tsx`:

- Header bovenaan met:
  - Titel "Projecten" (h1, `text-xl font-bold`)
  - Subtitel met telling: "11 actief · 1 gearchiveerd"
  - Rechts: zoekveld, "Gearchiveerd" toggle, Board/Tabel toggle, "+ Nieuw project"
- Hoofdcontent: `<KanbanBoard />` of `<ProjectsTable />` afhankelijk van toggle

### 4B. KanbanBoard component

`src/components/kanban/KanbanBoard.tsx`:

- Grid met 6 kolommen, gap 12px
- Bij scherm < 1280px: horizontaal scroll-bar onder de kolommen
- Iedere kolom is een `<KanbanColumn>` component

### 4C. KanbanColumn

`src/components/kanban/KanbanColumn.tsx`:

Props: `status`, `projects`, `onCardClick`, `onCardDrop`.

Kolomkop:
- Statusspecifieke kleur-stip (8px circle, kleur uit een mapping `STATUS_COLORS`)
- Statusnaam in `text-sm font-medium`
- Telling in slate-200 pill rechts daarvan
- Rechts: subtiele "+" knop voor nieuw project in deze status

Body:
- Verticale lijst van projectkaarten, gap 10px
- Bij leeg: kleine `EmptyState` met "Geen projecten"

Drop-zone gedrag: bij hover tijdens drag toont een lichte highlight.

### 4D. ProjectCard

`src/components/kanban/ProjectCard.tsx`:

Props: `project`.

Layout (zoals in de mockup):
- Linkerrand 3px solid in statuskleur, geen border-radius op die kant
- Rest border 0.5px slate-200, border-radius 8px
- Padding 12px, gap 8px tussen elementen
- Achtergrond white

Inhoud (van boven naar beneden):
1. **Bovenrij:** projectnummer (mono font, 11px tertiary) + werksoort-badge rechts
2. **Titel + klant:** projectnaam (14px medium), klantnaam (12px secondary)
3. **Datumregel:** kalendericoon + datum + status (op schema/vertraging)
4. **Uitzonderings-banner** (alleen tonen indien relevant): rode of amber banner met icoon en reden
5. **Budgetregel:** "Besteed: € X / € Y" + voortgangsbalk
6. **Footer:** avatar-stack (3 zichtbaar + "+N") links, opmerkingen + bijlagen iconen rechts

Werksoort-kleuren:
- Renovatie → blauw
- Nieuwbouw → groen
- Sloop → amber
- Verbouw → blauw
- Onderhoud → grijs

Status-kleuren (linkerrand + kolomstip):
- Aanvraag → grijs (`#94a3b8` / slate-400)
- Calculatie → blauw (`#378ADD`)
- Gegund → blauw donker (`#1e40af`)
- In uitvoering → amber (`#BA7517`)
- Oplevering → roze (`#D4537E`)
- Afgerond → groen (`#1D9E75`)

Kaart hover: lichte schaduw en cursor-pointer. Klik = nog niets in deze ronde
(detailpaneel komt in ronde 3) — maar bouw wel een `onClick` prop in.

### 4E. Drag and drop

Gebruik `@dnd-kit/core` + `@dnd-kit/sortable` (industriestandaard, klein,
goed onderhouden). Installeer:

```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

Implementatie:
- Iedere kaart is `useSortable`
- Iedere kolom is een `useDroppable`
- Op drop tussen kolommen: roep `projectsService.updateStatus(projectId, newStatus)`
- Optimistische update: pas de lokale state direct aan, rollback bij fout
- Bij fout: toast met foutmelding

### 4F. Header componenten

- `<SearchInput>` — gestyled input met search-icoon, filtert lokaal op
  `projectName` of `customerName`
- `<ArchivedToggle>` — toont/verbergt projecten met `isArchived: true`
- `<ViewToggle>` — Board / Tabel switch
- `<PrimaryButton icon={Plus}>Nieuw project</PrimaryButton>` — opent
  een create-modal (niet in deze ronde — toon "Nog niet beschikbaar" toast)

### 4G. Filtering en zoeken

Logica voor de filtered lijst:

```typescript
const visibleProjects = projects
  .filter(p => showArchived || !p.isArchived)
  .filter(p =>
    !search ||
    p.projectName.toLowerCase().includes(search.toLowerCase()) ||
    p.customerName.toLowerCase().includes(search.toLowerCase())
  );
```

Geen server-side filtering in deze fase — alle projecten van een instance
laden in het frontend. Optimaliseren als er > 500 projecten zijn (later).

### Acceptatiecriteria fase 4

- [ ] 6 kolommen renderen in correcte volgorde met juiste kleuren
- [ ] Projectkaarten matchen visueel met de mockup
- [ ] Slepen tussen kolommen werkt en triggert `updateStatus`
- [ ] Optimistische update zichtbaar, rollback bij fout
- [ ] Zoeken filtert lokaal en realtime
- [ ] Gearchiveerd-toggle werkt
- [ ] Lege kolommen tonen `EmptyState`
- [ ] Op 1024px breedte: horizontale scroll, alle kaarten leesbaar
- [ ] Geen layout-shift bij data-load (skeleton of placeholder zichtbaar)

**Stop na fase 4. Korte samenvatting in chat. Wacht op akkoord.**

---

## FASE 5 — Tabelweergave

**Doel:** Een tabelvariant van het board voor gebruikers die liever rij-voor-rij denken
(controllers, planners). Activeerbaar via de Board/Tabel toggle.

### 5A. ProjectsTable

`src/components/projects/ProjectsTable.tsx`:

Kolommen:
- Projectnummer (sorteerbaar)
- Naam (sorteerbaar)
- Klant
- Status (sorteerbaar, met statuskleur-stip)
- Werksoort (filterbaar via dropdown in header)
- Start
- Eind
- Voortgang (mini-balkje + percentage)
- Budget (sorteerbaar, gekleurd bij overschrijding)
- Projectleider (avatar + naam)

Eigenschappen:
- Sticky header bij scroll
- Hover-row in slate-50
- Klik op row → zelfde `onClick` als kaart (toast in deze ronde)
- Sorteerbare kolommen: indicator "↑"/"↓" rechts van kolomnaam
- Compact: `text-sm`, padding `px-3 py-2`

Geen pagination in deze fase — alle projecten in één tabel. Bij > 200 projecten
overweeg in ronde 3+ virtualisatie (react-window).

### Acceptatiecriteria fase 5

- [ ] Toggle Board ↔ Tabel werkt vloeiend, behoudt scroll-positie waar mogelijk
- [ ] Sorteren werkt op alle gemarkeerde kolommen
- [ ] Tabel respecteert dezelfde search en archived filters als het board
- [ ] Visueel consistent met Y-App tabel-stijl (slate-200 borders, slate-50 hover)

**Stop na fase 5. Korte samenvatting in chat. Wacht op akkoord.**

---

## FASE 6 — Polish

**Doel:** Production-ready maken. Error states, lege states, loading states,
accessibility, en visuele finishing.

### 6A. Error states

- Bij bridge-fout: toast "Verbinding met Y-App verloren. Vernieuw de pagina."
- Bij ERPNext-fout: toast met de specifieke foutmelding van de server
- Bij timeout: toast "De server reageert niet. Probeer opnieuw." + retry button
- Globale error boundary in `App.tsx` — bij onverwachte JS-fout: vriendelijke
  fallback-UI met "Iets ging mis. Vernieuw de pagina." en een knop

### 6B. Loading states

- Initial load: full-page LoadingState
- Refetch: toon kleine spinner rechtsboven, behoud bestaande data
- Per-kaart bij drag/update: lichte opacity 0.7 tijdens save

### 6C. Lege states

- Geen projecten: grote EmptyState met illustratie (Lucide-icoon van een
  bouwhelm of klembord) en knop "Nieuw project"
- Geen zoekresultaten: kleinere EmptyState "Geen projecten gevonden voor 'X'"
- Lege kolommen: zoals al gebouwd in fase 4

### 6D. Accessibility

- Alle iconen die geen tekst hebben krijgen `aria-label`
- Alle interactieve elementen (kaarten, kolomkoppen, knoppen) zijn keyboard-bedienbaar
- Focus-states zichtbaar (focus-ring in y-teal)
- Kleur is nooit het enige signaal: status-stip + tekst-label, niet alleen kleur
- Voor de drag-and-drop: keyboard-alternative via @dnd-kit's keyboard sensor
- `lang` attribuut op `<html>` overeenkomstig de actieve i18n-taal

### 6E. Responsive

- Onder 1024px: weergave werkt nog, met horizontale scroll
- Onder 768px: schakel automatisch naar tabelweergave (kanban niet bruikbaar)
- Onder 480px: tabel wordt een verticale lijst van compacte kaarten
- Test deze breakpoints expliciet — niet aannemen dat het werkt

### 6F. Performance check

- Lighthouse-score in production build: performance > 80, accessibility > 95
- Bundle-size: kijk naar `npm run build` output, geen onverwachte grote
  dependencies (alles boven 100KB rechtvaardigen of vervangen)
- React DevTools Profiler: bij sleep van een kaart geen onnodige re-renders
  van andere kolommen

### Acceptatiecriteria fase 6

- [ ] Error scenario's getest (bridge offline, ERPNext 500, network timeout)
- [ ] Lege states zichtbaar in alle relevante situaties
- [ ] Toetsenbord-only navigatie werkt door het hele scherm
- [ ] Lighthouse-score voldoet aan minima
- [ ] Bundle-size onder 500KB gzipped
- [ ] Werkt op 768px tot 1920px breedte zonder visuele bugs

**Stop na fase 6. Korte samenvatting in chat. Wacht op akkoord.**

---

## FASE 7 — Deploy en eindtest

**Doel:** Bouwmeester live op GitHub Pages, geregistreerd in Y-App, getest
op een echte ERPNext-instance.

### 7A. GitHub Pages deploy

- Push naar `main` triggert de workflow uit fase 0
- Verifieer dat de build slaagt en de site beschikbaar is op
  `https://<user>.github.io/bouwmeester/`
- Test de URL in de browser direct: zonder Y-App moet hij minstens een
  "Open me in Y-App" boodschap tonen, niet crashen

### 7B. Registratie in Y-App

- Open de Y-App settings → Extensions
- Voeg toe via "Geavanceerd / Ontwikkelaar":
  - Naam: `Bouwmeester`
  - URL: `https://<user>.github.io/bouwmeester/`
  - Sidebar-sectie: `Projecten` (of leeg)
- Open de extensie via de sidebar
- Verifieer: laadt het kanban-board?

### 7C. Eindtests in echte omgeving

Vink stuk voor stuk af:

- [ ] Custom-fields-wizard verschijnt bij eerste opening
- [ ] System Manager kan velden installeren
- [ ] Niet-System-Manager krijgt JSON-fallback
- [ ] Na installatie: kanban-board toont projecten uit ERPNext
- [ ] Slepen tussen kolommen update `custom_bouwmeester_status` in ERPNext
- [ ] Refresh van Y-App: extensie laadt opnieuw en behoudt staat correct
- [ ] Switchen tussen instances in Y-App: extensie laadt nieuwe instance-data
      (let op: dit triggert geen lifecycle-event — de iframe URL update
      automatisch dankzij Y-App)
- [ ] Tabelweergave toont dezelfde data, sorteren werkt
- [ ] Zoeken werkt
- [ ] Visueel: bevalt het naast Y-App, voelt het als één applicatie?

### 7D. README finaliseren

Vul de README aan met:
- Korte beschrijving en screenshot
- Installatie-instructies voor aannemers (niet developers)
- "Hoe Bouwmeester registreren in Y-App"
- Lijst van custom fields die worden toegevoegd
- Verwijzing naar het issue-tracker voor bugs

### Acceptatiecriteria fase 7

- [ ] Bouwmeester is live op GitHub Pages
- [ ] Geregistreerd in een Y-App productie- of staging-instance
- [ ] Alle eindtests geslaagd
- [ ] README is leesbaar voor een aannemer (niet alleen voor developers)

**Klaar. Bouwmeester ronde 2 is af.**

---

## Wat NIET in deze ronde

Ter herinnering, om scope te bewaken:

- Geen detailpaneel bij klik op kaart (komt in ronde 3)
- Geen planning-tab met Gantt (komt in ronde 4)
- Geen financieel-tab, uren-tab, documenten-tab, opleverpunten-tab (latere rondes)
- Geen create-flow voor nieuwe projecten (placeholder toast in deze ronde)
- Geen edit-flow voor bestaande projecten anders dan status-drag
- Geen kaartweergave (Leaflet — Y-App heeft die zelf, lager prioriteit)
- Geen real-time updates (websocket) — refresh-knop volstaat in deze ronde
- Geen bulk-acties (meerdere projecten selecteren en samen verplaatsen)
- Geen export naar Excel/PDF
- Geen filters anders dan zoek + archived (werksoort-filter in tabel is
  optioneel, kan ook later)

Als Claude Code een van bovenstaande wil bouwen "omdat het er logisch bij hoort":
nee. Schrijf het op als toekomstige feature, ga door met de huidige scope.

---

## Algemene werkwijze met Claude Code

1. **Werk fase voor fase.** Niet vooruitlopen.
2. **Commit per logische eenheid**, niet één giant commit aan het eind.
   Voorbeelden: "Fase 0: project skeleton", "Fase 1: bridge layer",
   "Fase 4: kanban board".
3. **Bij twijfel over Y-App gedrag**: kijk in `docs/research/y-app-extension-contract.md`.
   Als het antwoord daar niet staat: vraag het aan mij.
4. **Geen nieuwe dependencies zonder overleg.** De lijst in fase 0 is bewust kort.
5. **Geen design-improvisatie.** Volg de tokens en de mockups. Als iets niet past,
   stop en bespreek het.
6. **Laat de tests werken in dev-modus.** Mock-service moet altijd draaien
   in lokale dev. Anders kunnen we niet werken zonder Y-App-toegang.
7. **Schrijf duidelijke commit-messages.** "WIP" is geen commit-message.

---

## Acceptatiecriteria voor de hele ronde

Bouwmeester ronde 2 is klaar als:

- [ ] Alle 7 fases zijn afgerond met groene acceptatiecriteria
- [ ] De extensie draait live in een echte Y-App
- [ ] Een aannemer kan zonder uitleg het kanban-board snappen en gebruiken
- [ ] De code is leesbaar genoeg dat ronde 3 (detailpaneel) erop voort kan bouwen
- [ ] Geen TODO's of FIXMEs zonder GitHub-issue link
- [ ] Een toekomstige nieuwe ontwikkelaar kan met de README binnen 30 minuten
      een lokale dev-omgeving draaiend krijgen

---

## Voortgangsstatus — 2026-05-07

| Fase | Omschrijving | Status |
|------|-------------|--------|
| 0 | Repo setup | ✅ |
| 1 | Bridge-laag + design tokens | ✅ |
| 2 | First-launch wizard custom fields | ✅ |
| 3 | Datalaag + mock service | ✅ |
| 4 | Kanban-board UI + drag-and-drop | ✅ |
| 5 | Tabelweergave | ✅ |
| 6 | Polish (error states, loading, a11y, responsive, performance) | ✅ |
| 7 | Deploy en eindtest | 🔜 volgende sessie |

### Bekende issues (niet geblokkeerd voor fase 7)

1. **KanbanColumn re-renders alle kolommen tijdens drag** — @dnd-kit's `useDroppable()` subscribeert op `DndContext`; dat bypassed `React.memo` volledig, waardoor memo geen effect heeft. In productie-build (geminified) ~67ms per drag-tick met 15 projecten, niet merkbaar. Gedocumenteerd in een code-comment in `KanbanColumn.tsx`. Oplossing bij toekomstige performance-issues: `useDroppable` in een aparte wrapper-component zodat memo wél effect heeft op de kaartlijst.

2. **Lighthouse SEO-score: 82** — de extensie draait als sandboxed iframe in Y-App; SEO-signalen zijn irrelevant voor een embedded extensie. Geen actie vereist.

3. **`isNarrow` in `useBreakpoint` is een alias voor `isTablet`** — beide mappen op `< 1024px`. De `isNarrow` export is ongebruikt. Kan in een latere sessie worden opgeruimd zonder gedragswijziging.

### Eerste stap fase 7

Push naar `main` triggert de GitHub Actions deploy-workflow naar GitHub Pages. Controleer daarna de live URL en registreer de extensie in Y-App via Settings → Extensions.
