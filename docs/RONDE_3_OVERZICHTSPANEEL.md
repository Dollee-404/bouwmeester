# RONDE 3 — Overzichtspaneel

## Doel van deze ronde

Bouwmeester krijgt een overzichtspaneel dat opent wanneer een gebruiker op een projectkaart klikt. Het paneel toont alle relevante project-informatie in één scan-bare weergave, zonder dat de gebruiker hoeft door te klikken voor de meest voorkomende handelingen.

In RONDE 3 wordt alleen het **Overzicht-tab** functioneel. De andere zeven tabs (Planning, Calculatie, Financieel, Uren, Materialen, Documenten, Opleverpunten) zijn placeholders met "Nog niet beschikbaar in deze versie" en worden in latere rondes geactiveerd.

## Scope

**In scope:**
- Overlay-/drawer-systeem dat opent op klik op een ProjectCard
- Adaptief gedrag voor desktop, tablet en mobile
- Volledige Overzicht-tab met header, KPI-strook, fases, activiteit, projectteam, opdrachtgever, contract en labels
- Data-architectuur migratie (custom_address en custom_project_manager naar ERPNext-native)
- Twee nieuwe custom fields (custom_role op Project Users, custom_is_meerwerk op Sales Order)
- Bridge-uitbreidingen voor Tasks, Timesheets, Activity Log en Comments
- Lege states voor projecten zonder gedefinieerde fases (knop "Standaard fases toevoegen")

**Buiten scope:**
- Tab-content voor de andere zeven tabs (alleen placeholders)
- Inline editing van velden in het paneel
- Acties via Uren / Factureren / Actie-knoppen (placeholder met toast)
- Klikken op klantnaam, teamlid of activity-item naar detail
- Comments toevoegen vanuit het paneel
- Externe teamleden zonder ERPNext-account
- Multi-deelleveringen in financiële weergave
- Quotation → Sales Order conversie bij drag-naar-Gegund
- Risico-engine voor signaal-detectie
- Notificaties of e-mail bij gebeurtenissen

---

## Het overzichtspaneel — specificatie

### Patroon (adaptief)

| Breakpoint | Patroon |
|------------|---------|
| ≥1280px | Side-drawer rechts, ~75% breedte, kanban gedimd zichtbaar |
| <1280px en ≥768px | Bijna-fullscreen overlay (~95% breedte), smalle marge |
| <768px | Full-page vervanging met "Terug naar projecten" linksboven |

**Sluit-mechanisme:** X-knop (rechtsboven), Escape-toets, en klik op de backdrop buiten het paneel. Klikken binnen het paneel sluit het niet.

**Animatie:** paneel slidet 200-300ms ease-out vanaf rechts (desktop), fade-in op kleinere schermen. Tab-wissels: snelle content-fade 100ms.

### Header (sticky bovenaan)

**Eerste rij:**
- Linksboven: projectnummer (mono-tekst), werksoort-badge, status-badge
- Rechts: kebab-menu (⋮) en sluit-knop (X)

**Tweede rij:**
- Projectnaam in groot (24-28px font-weight 600)
- Subtitel: klantnaam · adres uit `customer.primary_address`

**Derde rij — Status-flow:**
- Horizontale visualisatie van 6 fases: Aanvraag → Calculatie → Gegund → In uitvoering → Oplevering → Afgerond
- Doorlopen fases met checkmark, huidige met accent-kleur, toekomstige met grijs
- Bij `custom_bouwmeester_status` = Verloren of Geannuleerd: rode banner bovenaan paneel "Project verloren" of "Project geannuleerd" zonder datum, status-flow blijft de 6 hoofdfases tonen

**Vierde rij — Placeholder-actieknoppen:**
- Uren / Factureren / Actie als placeholder-knoppen die bij klik een toast tonen "Nog niet beschikbaar in deze versie" (zelfde patroon als "+ Nieuw project"-knop in fase 7C)

### KPI-strook

Vier blokken naast elkaar (op desktop), 2x2 grid op mobile:

1. **Voortgang** — % afgerond uit ERPNext's `percent_complete`, sub-tekst "op schema" of "X dagen vertraagd", voortgangsbalk
2. **Budget** — € besteed van aanneemsom (uit Submitted Sales Orders), sub-tekst "van €X", balk groen/amber/rood
3. **Uren** — uren besteed (uit Timesheets) van uren-budget, sub-tekst "van Xu", balk
4. **Planning** — eerstvolgende mijlpaal (Task met `is_milestone=1`) of `expected_end_date`, sub-tekst "X dagen te gaan", tijdsbalk

**Speciale states per blok:**
- Budget overschreden: rood accent, "+ €X boven budget" als sub-tekst
- Achterstand: amber accent, "X dagen vertraagd"
- Geen data beschikbaar: "—" zonder balk

**Visuele specificaties:**
- Hoofdgetal 24-28px, font-weight 600
- Eenheid (%, €, u, dgn) kleiner, secundaire kleur
- Sub-tekst 12px, slate-500
- Voortgangsbalk 4-6px hoog

### Hoofdcontent — twee kolommen op desktop

**Linker hoofdkolom (~70% breedte):**

Tab-bar met 8 tabs:
1. **Overzicht** (actief)
2. Planning, 3. Calculatie, 4. Financieel, 5. Uren, 6. Materialen, 7. Documenten, 8. Opleverpunten — placeholders met "Nog niet beschikbaar" lege staat

Onder de tab-bar (alleen Overzicht-tab):

**Fases-sectie:**
- Lijst van fases (afgeleid uit Tasks met parent-relatie), elk blok bevat:
  - Naam van de fase
  - Voortgangs-percentage rechts
  - Twee voortgangsbalken: uren (besteed/budget) en budget (besteed/budget)
- **Lege staat:** als project geen Tasks met parent-relatie heeft, toon knop "Standaard fases toevoegen". Bij klik: roept Bridge-methode `createDefaultPhaseTasks(projectId, werksoort)` aan, paneel laadt opnieuw.

**Activiteit-sectie:**
- Lijst van laatste 5-10 events uit ERPNext Activity Log + Comments (gerelateerd aan project of gekoppelde records)
- Per event: icoon (afhankelijk van type), beschrijving, tijdstempel relatief ("vandaag · 14:32")
- "Alles tonen"-link rechts bovenaan (voor latere ronde een aparte feed-tab)

**Rechter zijbalk (~30% breedte):**

- **Projectteam:** Project Users met rol via `custom_role` (intern; externen later). Avatar + naam + rol per regel.
- **Opdrachtgever:** klantnaam + adres uit `customer.primary_address`
- **Contract:** vier rijen — Aanneemsom, Meerwerk, Gefactureerd, Openstaand
- **Labels:** auto-label werksoort (uitbreidbaar in latere ronde)

### Mobile aanpassing (<768px)

- Twee-kolom layout vervalt, alles gestackt onder elkaar
- KPI-strook wordt 2x2 grid
- Tab-bar scrollt horizontaal als tabs niet passen
- Header blijft sticky bovenaan
- Volgorde gestackt: header → KPI's → tab-bar → fases → activiteit → projectteam → opdrachtgever → contract → labels

### Visuele principes

**Density:** witruimte 24-32px tussen secties, 12-16px binnen secties. Geen lijnen waar witruimte volstaat.

**Typografie:** drie niveaus
- Hoofdcijfers en sectie-titels: 18-28px, font-weight 600
- Body-tekst en data: 14-16px, font-weight 400
- Labels en metadata: 12-13px, font-weight 400, kleur slate-500

**Kleur:**
- Y-App teal als accent voor actieve states
- Status-kleuren consistent met de kanban
- Witte achtergrond met subtiele border voor secties
- Donker accent alleen op interactieve elementen
- Geen verzadigde kleuren als achtergrond

**Iconografie:** Lucide React, 16-20px, naast tekst. Geen iconen-zonder-label tenzij universeel begrepen.

**Toegankelijkheid:**
- `role="dialog"` met `aria-modal="true"`
- Focus springt naar paneel bij openen
- Tab-toets navigeert door elementen
- Escape sluit het paneel
- Sluit-knop heeft `aria-label="Project sluiten"`

### Componenten

**Hergebruiken uit RONDE 2:**
- ProjectCard's status-stip en werksoort-badge
- Voortgangsbalk-component
- Toast-component (uit fase 6A)
- Avatar-component
- useBreakpoint hook (uit fase 6E)

**Nieuw te maken:**
- DetailPanel (overlay/drawer-systeem met adaptief gedrag)
- StatusFlow (horizontale flow met checkmarks)
- KPIBlock (kerncijfer met balk en speciale states)
- PhaseRow (fase met dubbele balken)
- ActivityItem (regel in feed)
- TabBar (tab-systeem voor het paneel)

---

## Data-architectuur wijzigingen

### Vervallen custom fields

| Veld | Waarom afgeschaft | Vervangen door |
|------|-------------------|---------------|
| `custom_address` | Duplicatie met ERPNext-native | `customer.primary_address` |
| `custom_project_manager` | Beperkt tot één persoon | Project Users child table |

### Nieuwe custom fields

| Veld | Doctype | Type | Doel |
|------|---------|------|------|
| `custom_role` | Project User (child table) | Select | Rol binnen het project: projectleider, uitvoerder, werkvoorbereider, calculator, anders |
| `custom_is_meerwerk` | Sales Order | Check | Onderscheid tussen aanneemsom-SO en meerwerk-SO |

### Behouden custom fields

- `custom_bouwmeester_status` (Bouwmeester-specifieke statusvolgorde)
- `custom_werksoort` (Bouwmeester-specifiek, niet 1-op-1 met `project_type`)
- `custom_budget_hours` (mogelijk afgeschaft als Tasks-aggregatie volledig is — voor RONDE 3 behouden)
- `custom_weersafhankelijk`

### Hergebruikt ERPNext-native

- `customer.primary_address` voor projectadres
- Project Users (child table) voor team
- Tasks met parent-relatie voor fases
- `percent_complete` voor algehele voortgang
- `expected_end_date` voor planning
- `total_sales_amount`, `total_billed_amount` voor financiële kerncijfers
- Timesheets voor uren-besteding
- Activity Log + Comments voor activiteit-feed
- Tasks met `is_milestone=1` voor mijlpalen

### Migratie-pad

**`custom_project_manager` → Project Users:**
Voor elk project waar `custom_project_manager` is ingevuld, voeg de user toe aan Project Users met `custom_role = projectleider`. Setup-wizard meldt: "Migratie uitgevoerd voor X projecten." `custom_project_manager` blijft voorlopig bestaan als fallback en wordt in fase 3F afgeschaft.

**`custom_address` → `customer.primary_address`:**
Geen automatische migratie. Setup-wizard waarschuwt: "Project X heeft alleen `custom_address` — beheerder moet dit overzetten naar Customer Address." `custom_address` blijft beschikbaar als fallback.

---

## Werkpakketten

### Fase 3A — Data-architectuur migratie

**Doel:** ERPNext-data-architectuur uitbreiden zonder dat de huidige Bouwmeester (RONDE 2) breekt.

**Subtaken:**
1. Custom field `custom_role` toevoegen aan Project Users child table via wizard-uitbreiding (Select: projectleider, uitvoerder, werkvoorbereider, calculator, anders)
2. Custom field `custom_is_meerwerk` toevoegen aan Sales Order via wizard-uitbreiding (Check, default nee)
3. Migratie-pad voor `custom_project_manager`: voor elk bestaand project, kopieer waarde naar Project Users met rol "projectleider"
4. Migratie-pad voor `custom_address`: waarschuwing in wizard voor projecten zonder `customer.primary_address`
5. Setup-wizard uitbreiden om de twee nieuwe custom fields te detecteren en installeren
6. Tests: wizard installeert nieuwe velden, migratie loopt zonder data-verlies, bestaande Bouwmeester blijft werken

**Acceptatie:**
- Wizard installeert beide nieuwe custom fields op een schone ERPNext-instance
- Migratie van `custom_project_manager` naar Project Users werkt
- Bestaande Bouwmeester blijft volledig functioneel (geen regressie)
- Documentatie bijgewerkt over data-architectuur

### Fase 3B — Bridge-laag uitbreiden

**Doel:** RPC-methoden toevoegen die het overzichtspaneel nodig heeft.

**Subtaken:**
1. `getProjectDetail(projectId)` — één Project ophalen met alle relevante velden inclusief Project Users en Customer-adres
2. `getProjectTasks(projectId)` — alle Tasks van een project ophalen met parent-relatie
3. `getProjectTimesheets(projectId)` — Timesheet-uren aggregeren per Task
4. `getProjectActivity(projectId, limit)` — Activity Log entries en Comments gefilterd, gesorteerd op datum, beperkt tot N items
5. `getProjectFinancials(projectId)` — Sales Orders (met meerwerk-onderscheid), Sales Invoices, betalingsstatus aggregeren
6. `createDefaultPhaseTasks(projectId, werksoort)` — fase-Tasks aanmaken op basis van werksoort. **De exacte fase-sets per werksoort worden tijdens deze fase samen vastgesteld met de domeinexpert.**

**Acceptatie:**
- Alle 6 nieuwe RPC-methoden gedocumenteerd in `src/bridge/README.md`
- Lokaal testbaar met mock-bridge
- Live testbaar tegen Drechtsteden Bouw ERPNext-instance

### Fase 3C — DetailPanel skelet en routing

**Doel:** het overlay-mechanisme bouwen dat het paneel toont, met adaptief gedrag.

**Subtaken:**
1. DetailPanel-component met overlay-gedrag en breakpoint-detectie (drawer / overlay / full-page)
2. State management voor `selectedProjectId` in ProjectsPage
3. Trigger-logica: klik op ProjectCard opent paneel, X / Escape sluit
4. Animaties: slide-in 200-300ms ease-out (desktop), fade-in (mobile)
5. Loading-state: skeleton-versie van layout terwijl data wordt opgehaald
6. Foutafhandeling: foutmelding binnen paneel met "Opnieuw proberen"-knop
7. Mock-data uitbreiden voor lokale ontwikkeling

**Acceptatie:**
- Paneel opent en sluit correct op alle drie breakpoints (1920px, 1024px, 480px)
- Loading-skeleton verschijnt direct bij openen
- Foutafhandeling werkt
- Toetsenbord-toegankelijk (Escape sluit, focus springt correct)

### Fase 3D — Header en KPI-strook

**Doel:** de bovenste delen van het paneel functioneel maken.

**Subtaken:**
1. PanelHeader-component (identificatie-rij, projectnaam, subtitel)
2. StatusFlow-component (horizontale flow met checkmarks)
3. Verloren/Geannuleerd-banner (rode banner bovenaan)
4. Placeholder-actieknoppen (Uren / Factureren / Actie met toast)
5. KPIBlock-component (generiek blok met speciale states)
6. KPI-strook met vier KPIBlocks (voortgang, budget, uren, planning)
7. Speciale states logica (overschrijding, achterstand, leeg)

**Acceptatie:**
- Header rendert correct voor projecten in elke status
- Verloren/Geannuleerd banner verschijnt alleen bij die statussen
- KPI-blokken tonen correcte data uit Bridge
- Speciale states (rood, amber, leeg) werken zoals gespecificeerd
- Visuele review tegen Y-App design tokens

### Fase 3E — Hoofdcontent en zijbalk

**Doel:** de rest van de Overzicht-tab functioneel maken.

**Subtaken:**
1. TabBar-component met 8 tabs, alleen Overzicht actief
2. PhaseRow-component (fase-blok met dubbele balken)
3. Fases-sectie met lijst van PhaseRows en lege staat
4. "Standaard fases toevoegen"-knop in lege staat (triggert `createDefaultPhaseTasks`)
5. ActivityItem-component (regel in feed met icoon)
6. Activiteit-sectie met lijst van 5-10 ActivityItems
7. Rechter zijbalk (Projectteam, Opdrachtgever, Contract, Labels)

**Acceptatie:**
- Tab-bar werkt, alleen Overzicht is functioneel
- Fases tonen correct, lege staat met functionerende knop
- Activiteit-feed toont 5-10 items uit Activity Log + Comments
- Zijbalk toont alle blokken correct
- Mobile-layout werkt (alles gestackt)

### Fase 3F — Cleanup en migratie afronden

**Doel:** de oude data-architectuur volledig vervangen door de nieuwe.

**Subtaken:**
1. `custom_project_manager` afschaffen (uit codebase verwijderen, fallback weghalen)
2. `custom_address` afschaffen of behouden als fallback (afhankelijk van migratie-status)
3. Wizard-optie om oude custom fields uit ERPNext te verwijderen (alleen voor System Manager)
4. README updaten met nieuwe custom fields tabel en known limitations
5. End-to-end testen zoals fase 7C (alle 9 tests opnieuw doorlopen)

**Acceptatie:**
- Geen referenties naar afgeschafte custom fields in codebase
- README accuraat bijgewerkt
- 9 e2e tests succesvol op de nieuwe versie

---

## Risico's en mitigaties

**Risico 1 — Tasks-data is niet beschikbaar of inconsistent in jouw ERPNext-instance.**
Bouwmeester moet goed omgaan met de lege fase-state. Mitigatie: lege state met "Standaard fases toevoegen"-knop is robuust en testbaar.

**Risico 2 — Activity Log levert minder rijk gevulde feed dan gehoopt.**
We accepteren dat de feed in RONDE 3 minimum-viable is. Latere rondes kunnen eigen event-tracking toevoegen.

**Risico 3 — Migratie verliest data.**
Vooral bij `custom_project_manager` → Project Users. Mitigatie: stapsgewijze migratie met expliciete bevestiging, gefaseerd uitrollen op test-instance eerst.

**Risico 4 — Adaptief paneel-gedrag wordt complex.**
Drie verschillende layouts zijn risicovol. Mitigatie: één component met conditional rendering op basis van breakpoint, niet drie componenten.

---

## Test-strategie

Per fase gedefinieerde acceptatie-criteria. Plus aan het einde van RONDE 3 een volledige end-to-end-cyclus zoals fase 7C:

1. Wizard detecteert + installeert nieuwe custom fields
2. Migratie verloopt correct
3. Paneel opent op klik op kaart
4. Data wordt correct geladen en gerenderd
5. Adaptief gedrag werkt op alle breakpoints
6. Lege states werken correct
7. Speciale states (overschrijding, achterstand) tonen correct
8. Sluit-mechanismen werken (X-knop en Escape)
9. Toegankelijkheid werkt (toetsenbord, screenreader)
10. Performance acceptabel (paneel opent merkbaar binnen 500ms na klik)

---

## Voor latere rondes (RONDE 4+)

Niet in scope voor deze ronde, maar genoteerd voor toekomst:

- Tab-content voor Planning, Calculatie, Financieel, Uren, Materialen, Documenten, Opleverpunten
- Inline editing van velden in het paneel
- Werkende Uren / Factureren / Actie-knoppen
- Comments toevoegen vanuit het paneel
- Externe teamleden (constructeur, architect) zonder ERPNext-account
- Multi-deellevering financiële weergave
- Quotation → Sales Order conversie bij drag-naar-Gegund
- Risico-engine voor automatische signaal-detectie
- Notificaties (in-app of e-mail)
- Mobile-specifieke acties
- Statistieken-overzicht per kwartaal
- Detail-panelen voor klant, teamlid, activity-item
- Eventueel afschaffen van `custom_budget_hours` ten gunste van Tasks-aggregatie
