# Bouwmeester — Inventarisatie Keukenbladen & Functionaliteitsaudit

**Datum:** 2026-05-26  
**Status:** Fase 1 voltooid — wacht op akkoord voor Fase 2 (uitvoeringsplan)

---

## 0. Disclaimer: ontbrekende referentiedocumenten

De taakopdracht verwees naar de volgende bestanden die **niet bestaan** in deze repo:

```
docs/erpnext-onderzoek/instanties/domera/03-gat-analyse.md
docs/erpnext-onderzoek/instanties/domera/04-architectuur-beslissingen.md
```

De map `docs/erpnext-onderzoek/` bestaat niet. Ook de repos `Impertio-Studio/Z-APP`, `Impertio-Studio/zapp_custom` en `zapp_domera` zijn niet vindbaar via GitHub. De inventarisatie is opgesteld op basis van wat wel aanwezig is.

---

## 1. Codebase-kaart

### Architectuur op hoofdlijnen

Bouwmeester is een **Y-App iframe-extensie**. De app draait in een sandboxed iframe; alle ERPNext-aanroepen lopen via een `postMessage`-bridge naar de Y-App parent window, die de ERPNext-sessie van de ingelogde gebruiker hergebruikt.

```
Y-App (browser tab)
  └── <iframe> Bouwmeester (React 19 + Vite + TypeScript + Tailwind v4)
        └── src/bridge/index.ts
              └── postMessage → Y-App host → ERPNext REST API
```

**Dev-direct modus:** via `VITE_DEV_ERPNEXT_URL` stuurt Vite API-calls via een proxy direct naar ERPNext zonder Y-App parent. Hiermee is lokaal testen met echte data mogelijk.

### Bestandsstructuur (actueel, inclusief session-commits)

```
src/
├── bridge/
│   └── index.ts                     ← RPC (postMessage + dev-direct)
├── data/
│   ├── types.ts                     ← BouwmeesterStatus, Werksoort, Project
│   ├── detail-types.ts              ← ProjectDetail, ProjectTask, QuotationItem, ...
│   ├── custom-fields-spec.ts        ← 10 custom fields + DEPRECATED custom_werksoort
│   ├── werksoort-config.ts          ← 8 werksoorten met kleuren (5F)
│   ├── default-phase-templates.ts   ← fasetemplates voor 5 werksoorten (GEEN keukenbladen)
│   ├── projects-service.ts          ← interface: list, getOne, updateStatus, createProject
│   ├── projects-service-erpnext.ts  ← ERPNext-implementatie
│   ├── projects-service-mock.ts     ← mock-implementatie
│   ├── project-detail-service.ts    ← interface: detail + quotations + tasks + ...
│   ├── project-detail-service-erpnext.ts
│   ├── project-detail-service-mock.ts
│   ├── quotations-service.ts        ← interface: getUnlinkedQuotations, linkQuotationToProject
│   ├── quotations-service-erpnext.ts ← haalt volledige docs op (Frappe workaround)
│   ├── quotations-service-mock.ts
│   ├── setup-check.ts               ← checkRequiredFields, installCustomFields, migraties
│   ├── planning-helpers.ts          ← werkdagen-berekening
│   └── index.ts                     ← exporteert projectsService + quotationsService
├── hooks/
│   ├── use-projects.ts
│   ├── use-breakpoint.ts
│   └── use-unlinked-quotations.ts   ← nieuw (session)
├── components/
│   ├── ui/                          ← button, input (design system)
│   ├── kanban/
│   │   ├── KanbanBoard.tsx          ← ontvangt unlinkedQuotations prop
│   │   ├── KanbanColumn.tsx         ← rendert OpnameCards boven project-cards
│   │   ├── OpnameCard.tsx           ← nieuw (session): keukenblad teal, doordrukken-knop
│   │   ├── ProjectCard.tsx          ← werksoort-identiteit (5F)
│   │   └── status-config.ts
│   ├── detail/
│   │   ├── DetailPanel.tsx          ← tabcontainer, laadt data, KPI-strook
│   │   ├── TabBar.tsx               ← 8 tabs (overzicht/planning/calculatie/+ 5 placeholder)
│   │   ├── PanelHeader.tsx          ← StatusFlow + actie-knoppen
│   │   ├── KPIBlock.tsx
│   │   ├── kpi-helpers.ts           ← calcVoortgangKPI, calcBudgetKPI, calcUrenKPI, calcPlanningKPI
│   │   ├── PhasesSection.tsx        ← fases + standaard-fases toevoegen
│   │   ├── PhaseCard.tsx
│   │   ├── Sidebar.tsx              ← team, opdrachtgever, contract, labels
│   │   ├── ActivityItem.tsx
│   │   ├── StatusFlow.tsx           ← visuele statuspijlijn (Aanvraag → Afgerond)
│   │   ├── calculatie/
│   │   │   ├── CalculatieTab.tsx    ← nieuw (session): laadt offertes via customerName
│   │   │   ├── QuotationCard.tsx    ← nieuw (session): header + itemtabel
│   │   │   └── QuotationItemsTable.tsx ← nieuw (session): inline rate-editing
│   │   └── planning/
│   │       ├── PlanningTab.tsx      ← situatiestrook + gantt + werkvoorraad
│   │       ├── GanttStrook.tsx      ← gantt-chart
│   │       ├── SituatieStrook.tsx
│   │       ├── WerkvoorraadStrook.tsx
│   │       ├── TaskDetailPaneel.tsx
│   │       ├── gantt-logica.ts
│   │       ├── werkvoorraad-logica.ts
│   │       └── phase-colors.ts      ← kleurpalet per werksoort (5E)
│   └── projects/
│       ├── NewProjectWizard.tsx     ← nieuw-project wizard (5D)
│       └── DoordrukkenWizard.tsx    ← nieuw (session): opname → project conversie
├── pages/
│   ├── ProjectsPage.tsx             ← kanban + doordrukkenQuotation state
│   └── SetupWizard.tsx              ← eenmalige installatie-wizard
├── i18n/nl.json                     ← volledig NL (calculatie/opname_card/doordrukken toegevoegd)
├── dev/TestPage.tsx                 ← dev-only testpagina
└── main.tsx
scripts/
├── install-holiday-list.ts
├── install-project-templates.ts
├── install-project-types.ts
├── install-wizard-fields.ts
├── migrate-werksoort.ts
└── test-*.ts
```

---

## 2. Placeholder- en gapentabel

| Tab / functie | Status | Bestand | Noot |
|---|---|---|---|
| **Overzicht** | ✅ Volledig | `detail/DetailPanel.tsx` + `PhasesSection`, `ActivityItem`, `Sidebar` | |
| **Planning** | ✅ Volledig | `detail/planning/PlanningTab.tsx` e.a. | Gantt, werkvoorraad, taakpaneel |
| **Calculatie** | ✅ Geïmplementeerd (session) | `detail/calculatie/CalculatieTab.tsx` | Zie §4 voor gaps |
| **Financieel** | ❌ Placeholder | `DetailPanel.tsx:260` → `t("tab.not_available")` | Geen component |
| **Uren** | ❌ Placeholder | idem | Geen component |
| **Materialen** | ❌ Placeholder | idem | Geen component |
| **Documenten** | ❌ Placeholder | idem | Geen component |
| **Opleverpunten** | ❌ Placeholder | idem | Geen component |
| **StatusFlow per werksoort** | ❌ Niet gedaan | `data/werksoort-config.ts` `statusFlow?` | RONDE 5G |
| **KPI-set per werksoort** | ❌ Niet gedaan | `data/werksoort-config.ts` `kpiSet?` | RONDE 5I |
| **Fasetemplates keukenbladen** | ❌ Ontbreekt | `data/default-phase-templates.ts` | Geen template voor "Keukenbladen" |
| **Tabelweergave projecten** | ⏳ Bewust uitgesteld | `ProjectsPage.tsx` → `table_coming_soon_title` | Kanban is primary |
| **Activiteit "Alles tonen"** | ❌ Knop aanwezig, geen functie | `DetailPanel.tsx` | Knop staat er, werkt niet |
| **Dev-direct modus** | ✅ Gecommit (bbb1990) | `bridge/index.ts`, `vite.config.ts` | Dev-direct via VITE_DEV_ERPNEXT_URL |
| **quotations-service fix** | ✅ Gecommit (bbb1990) | `quotations-service-erpnext.ts` | Fix voor Frappe Link-veld limitatie |

---

## 3. ERPNext-integratieoverzicht

### Custom fields geïnstalleerd via setup-wizard

| Doctype | Veldnaam | Type | Doel |
|---|---|---|---|
| Project | `custom_bouwmeester_status` | Select | Kanban-status |
| Project | `custom_werksoort` | Select | **DEPRECATED** (RONDE 5C) — fallback only |
| Project | `custom_budget_hours` | Float | Urenbudget |
| Project | `custom_weersafhankelijk` | Check | Planning-context |
| Project | `custom_project_manager` | Link/User | **DEPRECATED** — nu via Project User |
| Project | `custom_address` | Small Text | Projectadres |
| Project User | `custom_role` | Select | Projectleider/uitvoerder/etc. |
| Sales Order | `custom_is_meerwerk` | Check | Meerwerk-markering |
| Task | `custom_wacht_op` | Select | Blokkerend obstakel |
| Task | `custom_wacht_op_toelichting` | Small Text | Toelichting wacht-op |

### Custom fields op Quotation (buiten setup-wizard)

Deze velden worden aangemaakt door de **keukenblad-opname app** (aparte extensie), niet door Bouwmeester's installatie-wizard:

| Veldnaam | Type | Aangemaakt door |
|---|---|---|
| `kbf_opname` | Check | Opname-app |
| `kbf_meetdatum` | Date | Opname-app |
| `kbf_inmeter` | Data | Opname-app |
| `kbf_opname_json` | Long Text | Opname-app |
| `kbf_tekening_pdf` | Attach | Opname-app (Sprint 3a, nog in ontwikkeling) |
| `kbf_project` | Link → Project | **Bouwmeester** (DoordrukkenWizard) — NIET in custom-fields-spec |

**Kritiek:** `kbf_project` staat niet in `custom-fields-spec.ts` en wordt dus niet geïnstalleerd via de setup-wizard. Bij een verse ERPNext-installatie ontbreekt dit veld.

### Frappe REST API beperkingen

| Aspect | Status |
|---|---|
| Y-App postMessage RPC | ✅ Werkend productie-pad |
| Dev-direct via Vite proxy | ✅ Werkend (gecommit bbb1990) |
| Child table updates | Volledige items-array verplicht — `name` (row docname) moet behouden blijven |
| Link-veld in list-query | ❌ Frappe blokkeert dit — workaround: volledige doc ophalen per offerte |

---

## 4. Keukenbladen calculator — diepteanalyse

### Hoe de calculatie-tab nu werkt

```
CalculatieTab (customerName prop)
  └── projectDetailService.getProjectQuotations(customerName)
        └── fetchList("Quotation", { filters: [kbf_opname=1, party_name=customerName] })
              + fetchDocument per offerte
                └── QuotationCard + QuotationItemsTable (inline rate-editing)
```

### Kritieke architectuurgap: koppeling via klant, niet via project

De tab haalt offertes op via `party_name = customerName`. Dit betekent:

- Als een klant meerdere keukenblad-offertes heeft (meerdere projecten), **ziet het ene project ook de offertes van het andere**.
- Na doordrukken zit `kbf_project` wél op de offerte, maar de calculatie-tab gebruikt dit veld niet om te filteren.

**Correcte koppeling:** filter op `kbf_project = projectId` in plaats van `party_name`. Vereist dat `kbf_project` aanwezig is in ERPNext.

### Wat de opname-app aanlevert (Quotation items)

Elk blad resulteert in maximaal 4 typen regels:

| Regeltype | UOM | Item code voorbeeld |
|---|---|---|
| Aanrechtblad | Square Meter | `COMPOSIET-BLAD-20MM`, `GRANIET-BLAD-30MM` |
| Randafwerking | Meter | `TOESLAG-RAND-DV40`, `TOESLAG-RAND-T1`, `TOESLAG-RAND-KF` |
| Sparing | Nos | `TOESLAG-SPARING-ONDERBOUW`, `TOESLAG-SPARING-KOOKPLAAT-VLAKBOUW` |
| Boorgat | Nos | `TOESLAG-BOORGAT-KRAAN`, `TOESLAG-BOORGAT-QUOOKER` |
| Verstekverbinding | Nos | `TOESLAG-RAND-VERSTEK` |

### Wat ontbreekt in de calculatie-tab

| Gemis | Impact |
|---|---|
| Filter op `kbf_project` i.p.v. `party_name` | Hoog — verkeerde offertes kunnen zichtbaar zijn |
| Filteren op offerte-status (alleen Draft/Submitted) | Hoog — gecancelde offertes worden getoond |
| Totaalrij per offerte | Middel — kantoor ziet geen totaalbedrag |
| `kbf_project` in custom-fields-spec | Kritisch — veld ontbreekt bij verse installatie |
| Link naar werkplaatstekening PDF (`kbf_tekening_pdf`) | Laag |
| Weergave `kbf_opname_json` (ruwe opname-specificaties) | Laag |

### Huidig prijsinvul-proces

1. Opname-app maakt Quotation aan met `rate: 0` op alle regels
2. Kantoor opent Bouwmeester → Calculatie tab → bewerkt rates inline
3. Elke rate-edit stuurt een volledige items-array PUT naar ERPNext
4. ERPNext berekent `amount = qty × rate` automatisch

Geen validatie of statusovergang (Draft → Submitted) geïntegreerd.

---

## 5. Klantwensen en pijnpunten (feedback klant)

### Wat de klant zoekt in een ERP-oplossing

| # | Wens | Huidige dekking in Bouwmeester / ERPNext | Gap |
|---|---|---|---|
| 1 | Duidelijke structuur: order → inmeten → tekeningen → productie → levering/montage | Deels — kanban + Planning-tab dekken voortgang, maar productie en levering ontbreken | Productie- en leveringsfasen zijn geen eigen tabs/flows |
| 2 | Inzicht en voortgang per fase, taken en verantwoordelijkheden per afdeling | Deels — PhasesSection + taken bestaan, maar geen afdeling-toewijzing | Geen afdelingsfilter op taken |
| 3 | Koppeling verkoop ↔ werkvoorbereiding ↔ productie (één centrale plek) | Deels — Calculatie-tab verbindt verkoop met werkvoorbereiding; productie ontbreekt | Productie-tab + werkbonnen ontbreken |
| 4 | Tekeningen en revisies beheren, beschikbaar op werkvloer | Niet aanwezig — `kbf_tekening_pdf` bestaat als veld, maar Bouwmeester toont hem niet | Documenten-tab is placeholder; geen revisie-beheer |
| 5 | Ondersteuning maatwerk (afmetingen, bewerkingen: zagen/polijsten/bewerken) | Deels in opname-app (afmetingen per blad, sparingen, randafwerkingen) — niet in Bouwmeester | Maatwerk-specificaties niet zichtbaar in project-paneel |
| 6 | Voorraadbeheer | Niet aanwezig — ERPNext heeft Stock-module maar Bouwmeester koppelt er niet aan | Volledig gap — Materialen-tab is placeholder |
| 7 | Werkbonnen en productie-aansturing voor operators | Niet aanwezig | Geen werkbon-component |
| 8 | 2D-tekenprogramma (bijv. Autodesk Fusion) | Buiten scope Bouwmeester — opname-app heeft eigen SVG-canvas (Sprint 3a) | Integratie met extern tekenprogramma niet voorzien |
| 9 | Facturatie (verkoop- en inkoopfacturen) | Niet aanwezig in Bouwmeester — ERPNext heeft Sales Invoice maar Bouwmeester koppelt niet | Financieel-tab is placeholder |
| 10 | Digitale planning: inmeten, leveren, montage, service | Deels — Planning-tab dekt taken; aparte planning voor inmeten/levering/montage ontbreekt | Geen agenda-/dispatching-view |

### Grootste uitdagingen van de klant — vertaald naar gaps

| Uitdaging klant | Vertaling naar Bouwmeester |
|---|---|
| **Versnipperde informatie** | Calculatie-tab toont offertes; rest (tekeningen, werkbonnen, voorraad, facturen) staat alleen in ERPNext, niet gebundeld in Bouwmeester |
| **Afstemming verkoop → productie** | DoordrukkenWizard verbindt opname met project, maar er is geen gestructureerde overdracht naar productie (geen werkbon, geen productiestatus) |
| **Beheer tekeningen en wijzigingen** | `kbf_tekening_pdf` bestaat in ERPNext maar is niet zichtbaar in Bouwmeester; revisie-tracking ontbreekt volledig |
| **Planning en voortgangsoverzicht** | Planning-tab werkt per project; geen cross-project-planning voor inmeten, levering en montage |
| **Voorraadbeheer (handmatig)** | ERPNext Stock-module bestaat maar Bouwmeester heeft geen Materialen-tab |
| **Facturatie niet optimaal aansluitend** | Financieel-tab is placeholder; geen koppeling met Sales Invoice of betaalstatus |

---

## 6. Productie- en leverproces (keukenbladen)

```
1. Inmeter → tablet → y-app-keukenblad-opname
2. Wizard stap 1: Project & klant (klant zoeken in ERPNext)
3. Wizard stap 2: Tekening (SVG canvas of foto)  ← Sprint 3a, IN ONTWIKKELING
4. Wizard stap 3: Specificaties (materiaal, kleur, zichtzijden, sparingen)
5. Wizard stap 4: Overzicht → PDF genereren → ERPNext opslaan
   ├── Werkplaatstekening PDF → kbf_tekening_pdf (zaagbrief voor Vasto)
   ├── Klantbevestiging PDF (handtekening-veld)
   └── Quotation aanmaken: kbf_opname=1, rate=0 op alle regels

6. Kantoor opent Bouwmeester:
   ├── Lead-kolom: OpnameCard verschijnt
   ├── "Doordrukken" → project aanmaken (werksoort=Keukenbladen, kbf_project gezet)
   └── Calculatie-tab: rates invullen

7. Offerte indienen → [GAP: geen geïntegreerde statusflow]
8. Productie bij Vasto (buiten scope Bouwmeester)
9. Levering + plaatsing
10. Sales Order + facturering → [GAP: Financieel-tab is placeholder]
```

**Vasto** is de producent. De werkplaatstekening PDF fungeert als zaagbrief.

---

## 7. UI/UX-audit

### Wat goed werkt

| Patroon | Beoordeling |
|---|---|
| Kanban drag-and-drop (@dnd-kit) | ✅ Tactiele feedback werkt goed |
| KPIs op projectpaneel (4 blokken) | ✅ Compact en helder |
| Planning-tab (Gantt + werkvoorraad) | ✅ Werkdagen-bewust, mijlpalen, taakpaneel |
| Responsive layout (fullpage/overlay/drawer) | ✅ 3 breakpoints |
| Werksoort-kleuren op kaarten (5F) | ✅ Visueel onderscheid duidelijk |
| OpnameCard in Lead-kolom | ✅ Duidelijk onderscheid van project-cards |
| DoordrukkenWizard | ✅ Zelfde patroon als NewProjectWizard |

### Gaps / verbeterpunten

| Probleem | Ernst |
|---|---|
| 5 tabs tonen "Nog niet beschikbaar" | Hoog |
| Activiteit "Alles tonen" werkt niet | Middel |
| Calculatie: geen offerte-totaal | Middel |
| Calculatie: gecancelde offertes zichtbaar | Middel |
| Geen fasestemplate voor Keukenbladen | Middel |
| StatusFlow: readonly, geen statuswijziging mogelijk | Laag |
| Geen werksoort-specifieke statusstappen (5G) | Laag |
| KPI's tonen 0 voor projecten zonder ERPNext-data | Laag |

---

## 8. Recent gecommitte wijzigingen (commit bbb1990)

| Bestand | Inhoud |
|---|---|
| `src/bridge/index.ts` | Dev-direct modus via VITE_DEV_ERPNEXT_URL |
| `src/data/quotations-service-erpnext.ts` | Fix: volledige docs ophalen i.p.v. list (Frappe Link-veld limitatie) |
| `vite.config.ts` | Proxy-configuratie voor dev-direct |

---

## 9. RONDE 5 — resterende taken

| Taak | Status |
|---|---|
| 5A — ERPNext project_type fundament | ✅ |
| 5B — werksoort templates | ✅ |
| 5C — migratie custom_werksoort | ✅ |
| 5D — project-aanmaak met template | ✅ |
| 5E — kleurpalet per werksoort Gantt | ✅ |
| 5F — werksoort-identiteit ProjectCard | ✅ |
| 5G — StatusFlow per werksoort | ❌ |
| 5I — KPI-set per werksoort | ❌ |
| 5J — polish, i18n, edge cases | ❌ |

Extra buiten RONDE 5 (session): Calculatie-tab + OpnameCard + DoordrukkenWizard.

---

## 10. Keukenblad Opname App — context

Repo: `Dollee-404/y-app-keukenblad-opname` (volledig apart van Bouwmeester)

Zelfstandige Y-App extensie voor **De Keukenbladenfabriek**. Koppeling met Bouwmeester loopt uitsluitend via ERPNext Quotation-documenten.

**Actuele sprint:** 3a — tekening (SVG canvas, touch-first, tablet)

**Datadichtheid:**
- 11 materialen, 561 kleuren, 21 zichtzijden, 23 werkstuktypen
- Offline-first via localStorage

**ERPNext-output per opname:**
- Werkplaatstekening PDF (`kbf_tekening_pdf`) voor zaagbrief aan Vasto
- Klantbevestiging PDF
- Quotation met `kbf_opname=1`, `rate=0` per regel

---

## 11. Prioriteitenmatrix

| # | Onderwerp | Type | Urgentie | Complexiteit |
|---|---|---|---|---|
| 1 | ~~Uncommitted wijzigingen committen~~ | ~~Fix~~ | ✅ Gedaan (bbb1990) | — |
| 2 | `kbf_project` toevoegen aan `custom-fields-spec.ts` | Fix | Kritisch | Laag |
| 3 | Calculatie-tab: filter op `kbf_project` i.p.v. `party_name` | Fix | Hoog | Middel |
| 4 | Calculatie-tab: offerte-status filteren | Fix | Hoog | Laag |
| 5 | Fasestemplate voor Keukenbladen | Feature | Middel | Laag |
| 6 | Calculatie-tab: totaalrij per offerte | UX | Middel | Laag |
| 7 | RONDE 5G: StatusFlow per werksoort | Feature | Middel | Middel |
| 8 | Calculatie-tab: link naar werkplaatstekening | Feature | Laag | Middel |
| 9 | RONDE 5I: KPI-set per werksoort | Feature | Laag | Middel |
| 10 | Financieel-tab: Sales Order / facturering | Feature | Laag | Hoog |

---

*Inventarisatie op basis van lokale codebase + GitHub repo `Dollee-404/y-app-keukenblad-opname`. De vermelde `docs/erpnext-onderzoek/` en `Impertio-Studio/*` repos zijn niet beschikbaar.*
