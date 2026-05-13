# CLAUDE CODE KICKOFF — RONDE 5

**Project:** Bouwmeester (Y-App extensie voor aannemersbedrijven op ERPNext)
**Repo:** `/home/eelke/Documenten/Github/Y-App/bouwmeester`
**Live:** https://Dollee-404.github.io/bouwmeester/
**Test-omgeving:** Drechtsteden Bouw B.V. via Y-App
**Uitgangspunt:** RONDE 4 is volledig afgesloten en gemerged naar `main`. Planning-tab is live.

---

## VERBINDINGEN

**ERPNext-instance:** `https://drechtstedenbouw-erp.prilk.cloud`
- Credentials staan lokaal op Eelkes machine, niet in deze repository
- API-token vraag bij Eelke aan het begin van de sessie als de fetch-helper een 401 geeft

**GitHub:** `https://github.com/Dollee-404/bouwmeester`
- Branch deze ronde: `ronde-5-werksoort-templates`
- Pull Request voor eindmerge — geen directe push naar `main`

**Lokale ontwikkeling:**
- Repo: `/home/eelke/Documenten/Github/Y-App/bouwmeester`
- Dev-server: `npm run dev` (poort wisselt — Vite kiest beschikbare poort, vaak 5176/5177)
- TestPage met dummy-data en showcase: `?dev=1` aan de URL toevoegen

**Y-App context:** Bouwmeester draait als iframe-extensie binnen Y-App, vier URL-params worden doorgegeven (`host`, `instance`, `erpUrl`, `lang`). In dev-mode buiten Y-App: deze worden gemockt.

---

## GIT-WORKFLOW — FEATURE BRANCH

Eén feature branch voor de hele ronde, conform RONDE 4-patroon.

**Aan het begin (vóór 5A):**
```bash
git checkout main
git pull
git checkout -b ronde-5-werksoort-templates
```

**Tijdens de ronde:**
- Werk uitsluitend op `ronde-5-werksoort-templates`
- Commit aan het einde van elke sub-fase, vóór het stop-moment
- Commit-bericht: `ronde 5[letter]: korte beschrijving`
- Push na elke commit zodat Eelke de tussenstaat kan inzien

**Aan het einde (na groen licht op 5J):**
- Pull Request op GitHub, niet directe merge
- Titel: "RONDE 5: Werksoort-templates"
- Eelke geeft akkoord, merge via GitHub UI

**Stop-momenten zijn écht stoppen.** STOP betekent geen commit, geen verder werk, alleen wachten op visuele review. Dit is bij RONDE 4 meerdere keren misgegaan; in RONDE 5 niet meer.

---

## SCOPE RONDE 5 — Werksoort-templates

Bouwmeester behandelt nu alle projecten gelijk. Dat klopt niet met de werkelijkheid: een nieuwbouwproject heeft fundamenteel andere fases, KPI's en pijplijn-stappen dan een asbestsanering of een verbouwing. RONDE 5 introduceert werksoort-templates: vijf standaard projecttypes (nieuwbouw, renovatie, verbouw, sloop, sanering) met elk een eigen visuele en inhoudelijke identiteit.

**Architectuur-principe (kritisch lezen):**
Bouwmeester gebruikt ERPNext-native mechanismen waar ze bestaan. Geen nieuwe custom fields op ERPNext-doctypes. Geen nieuwe doctypes. Werksoorten worden gekoppeld via het standaard `project_type` Link-veld op Project. Project-aanmaak gebeurt via Frappe's bestaande "Create Project from Template"-functie. Bouwmeester-specifieke configuratie (kleurpalet, StatusFlow-pijplijn, KPI-set per werksoort) leeft in TypeScript-code, niet in ERPNext.

**Dit is een herziening ten opzichte van eerdere rondes.** In RONDE 1-4 zijn we de gewoonte aangegaan om elk probleem op te lossen met een custom field op ERPNext. Dat is geen schande maar wel een patroon waar we vanaf willen. Tien custom fields hebben we al toegevoegd — RONDE 5 voegt er nul toe en zet `custom_werksoort` op het pad naar verwijdering.

---

## FASERING + STOP-MOMENTEN

Tien sub-fases, met drie merge-momenten naar `main` als veiligheidskleppen. De tussen-merges zijn aanrader, geen verplichting — Eelke beslist per merge-moment.

### Blok I — Fundament

**5A: ERPNext-fundament + datamodel**
- Inventariseer de bestaande Project Type-doctype-staat: drie defaults (Internal/External/Other), geen custom fields, geen records gekoppeld
- Installeer vijf bouw-specifieke Project Types via een installatie-script (vergelijkbaar met hoe custom fields nu worden geïnstalleerd): Nieuwbouw, Renovatie, Verbouw, Sloop, Sanering
- Definieer in `src/data/werksoort-config.ts` een typed mapping van Project Type-naam naar Bouwmeester-configuratie. Voor nu: alleen de naam en een placeholder voor `palet`, `statusFlow`, `kpiSet` — invulling volgt in 5D-5H
- Helper `getWerksoortConfig(projectType: string)` met fallback naar een neutrale default-configuratie voor onbekende types
- Type-definities die uitbreidbaar zijn voor toekomstige velden (palet, flow, KPI's)

*Commit: `ronde 5a: ERPNext-fundament en datamodel`*
*STOP: Eelke verifieert dat de vijf Project Types in ERPNext staan en de typed mapping correct werkt.*

**5B: Project Templates installeren**
- Vijf Project Templates via installatie-script, één per werksoort
- Elk template bevat alleen fase-Tasks (`is_group=1`) op top-niveau, geen sub-Tasks (komt in latere ronde)
- Fase-sets per werksoort:
  - Nieuwbouw: Fundering & Grondwerk / Ruwbouw & Constructie / Installaties / Afwerking / Buitenterrein
  - Renovatie: Sloop / Constructie / Installaties / Afbouw / Oplevering
  - Verbouw: Opname / Voorbereiding / Ruwbouw / Afbouw / Oplevering
  - Sloop: Inventarisatie / Sloop / Afvoer & Verwerking
  - Sanering: Onderzoek / Sanering / Vrijgave & Rapportage
- Frappe `expected_start_date` en `expected_end_date` als offsets vanaf project-start (in dagen)
- Installatie idempotent — bij her-installeren niet dupliceren

*Commit: `ronde 5b: Project Templates per werksoort`*
*STOP: Eelke verifieert in ERPNext dat de templates correct staan, en opent één template ter inspectie.*

**5C: Migratie `custom_werksoort` → `project_type`**
- Migratiescript dat alle bestaande projecten met gevuld `custom_werksoort` koppelt aan het juiste `project_type`
- Mapping-tabel: "Nieuwbouw" → ERPNext Project Type "Nieuwbouw", "Verbouw" → "Verbouw", etc. Onbekende waarden in `custom_werksoort` (bijv. "Onderhoud" als die niet in de set zit) loggen en niet automatisch migreren
- Script is idempotent — bij meermalig draaien geen schade
- **Services aanpassen voor read-fallback** — loop alle bestanden langs die nu `custom_werksoort` lezen en pas elk aan zodat `project_type` primair wordt gelezen, met `custom_werksoort` als read-only fallback als `project_type` leeg is. Verwachte bestanden (niet uitputtend — Claude Code inventariseert eerst zelf):
  - `src/data/project-detail-service-erpnext.ts`
  - `src/data/project-list-service-erpnext.ts` of vergelijkbaar
  - Eventuele kanban-card-services en componenten
  - De werksoort-config-lookup uit 5A (die moet ook beide bronnen kunnen lezen)
- Niet meer schrijven naar `custom_werksoort` vanuit Bouwmeester — alleen lezen indien `project_type` leeg
- Documenteer expliciet als known limitation: `custom_werksoort` wordt in RONDE 6 of later verwijderd nadat alle systemen volledig op `project_type` zijn overgegaan

*Commit: `ronde 5c: migratie custom_werksoort naar project_type`*
*STOP: Eelke verifieert dat alle 15 actieve projecten correct gemigreerd zijn en geen onverwacht verlies van werksoort-informatie. Daarnaast: een vers project (nieuw aangemaakt na de migratie) gedraagt zich correct via `project_type` alleen.*

**Optioneel merge-moment 1 naar `main`:** Eelke kan na 5C kiezen om Blok I te mergen naar `main` voor live-test van de fundament-laag. UI gedraagt zich daarna identiek aan voor de ronde — alleen de databron is veranderd. Veilig.

### Blok II — Project-aanmaak-flow

**5D: Bouwmeester project-aanmaak-flow**
- "Nieuw project"-knop in Bouwmeester UI (locatie te bepalen — bovenop kanban-board of als losse pagina)
- Wizard-flow: werksoort kiezen → template kiezen → klant kiezen → start-datum → projectnaam → "Aanmaken"
- Onder de motorkap: Frappe `frappe.client.insert` op Project met `project_type` en `project_template` als velden. Frappe vult automatisch de Tasks aan vanuit de template
- Na aanmaak: navigeer in Bouwmeester naar het nieuwe project
- Foutafhandeling: validatiefouten van Frappe correct tonen aan gebruiker

*Commit: `ronde 5d: project-aanmaak-flow met template`*
*STOP: Eelke maakt zelf een testproject aan via de nieuwe flow en verifieert dat alles in ERPNext correct landt.*

### Blok III — Visuele identiteit

**5E: Kleurpalet per werksoort**
- Definieer in `werksoort-config.ts` per werksoort een palet (5 kleuren — één per fase, plus uitbreidbaarheid voor langere fase-sets)
- Werksoort-paletten moeten harmoniëren met de Y-App teal-tokens (zoals in RONDE 4 vastgesteld)
- Vóór implementatie: één visuele showcase met de vijf paletten naast elkaar — Eelke beoordeelt visueel of de paletten passen. Geen implementatie tot akkoord
- Pas implementatie toe op fase-balken in de Gantt (vervangt huidige hardcoded palet uit RONDE 4)

*Commit: `ronde 5e: kleurpalet per werksoort`*
*STOP: Eelke vergelijkt visueel hoe de Planning-tab er nu uitziet voor verschillende werksoort-projecten.*

**5F: Werksoort-identiteit in ProjectCard (kanban)**
- ProjectCard toont werksoort-indicator: subtiele kleur-accent en/of werksoort-label
- Geen invasie van de bestaande card-layout
- Werkt voor alle vijf werksoorten en valt elegant terug op neutraal voor onbekende werksoorten

*Commit: `ronde 5f: werksoort-identiteit in ProjectCard`*
*STOP: Eelke bekijkt de kanban met projecten van verschillende werksoorten en beoordeelt visuele rust.*

**5G: StatusFlow-pijplijn per werksoort**
- De 6-fasen header (Aanvraag → Calculatie → Gegund → In uitvoering → Oplevering → Afgerond) wordt werksoort-afhankelijk
- Per werksoort eigen pijplijn-stappen, gedefinieerd in `werksoort-config.ts` als ordered array
- Voorbeelden:
  - Nieuwbouw/Renovatie/Verbouw: standaard 6 stappen
  - Sloop: Aanvraag → Inventarisatie → Calculatie → Gegund → Uitvoering → Afgerond
  - Sanering: Aanvraag → Onderzoek → Calculatie → Gegund → Sanering → Vrijgave → Afgerond
- StatusFlow-component moet variabele lengte aankunnen (5, 6 of 7 stappen) zonder visuele kapotgaan
- Default voor projecten zonder herkende werksoort: 6 standaard-stappen (huidige gedrag)

*Commit: `ronde 5g: StatusFlow-pijplijn per werksoort`*
*STOP: Eelke bekijkt de header voor projecten van verschillende werksoorten in alle drie viewport-breedtes.*

**Optioneel merge-moment 2 naar `main`:** na 5G is Blok II + III samen een logische unit (de werksoort wordt nu zichtbaar beleefd door de gebruiker). Eelke kan kiezen om dit nu te mergen voor live-test, of doorgaan naar Blok IV.

### Blok IV — Inhoudelijke verschillen

**5H: Werksoort-bewuste Planning-tab**
- De Planning-tab uit RONDE 4 gebruikt nu hardcoded fase-data. Maakt nu gebruik van het werksoort-config-systeem
- Fase-set komt uit de Project Type-Template, kleur komt uit het werksoort-palet
- Auto-detectie kritieke pad, mijlpalen, werkvoorraad — alles werkt mee
- Test expliciet voor twee werksoorten verschillende viewports

*Commit: `ronde 5h: werksoort-bewuste Planning-tab`*
*STOP: Eelke opent projecten van minstens drie verschillende werksoorten en verifieert de Planning-tab.*

**5I: KPI-set per werksoort**
- De vier KPI-blokken (Voortgang/Budget/Uren/Planning) blijven default
- Per werksoort optioneel andere KPI's of accenten:
  - Sanering: focus op "voortgang in m³ afgevoerd materiaal" (placeholder — werkelijke meeteenheid komt uit ERPNext Task-data of een latere ronde)
  - Sloop: focus op "afvoer-percentage"
  - Renovatie/Nieuwbouw/Verbouw: standaard vier
- Niet over-engineeren: één werksoort hoeft maar één KPI-verschil te hebben om het concept te bewijzen
- Eelke beslist per werksoort welke KPI-verschillen het waard zijn

*Commit: `ronde 5i: KPI-set per werksoort`*
*STOP: Eelke beoordeelt of de KPI-verschillen waarde toevoegen of overbodig zijn.*

### Blok V — Afronding

**5J: Polish + edge cases + i18n**
- i18n: alle nieuwe strings in `nl.json` + `en.json`
- Lege staten:
  - Project zonder werksoort (project_type leeg, custom_werksoort leeg)
  - Project met onbekende werksoort (project_type bevat waarde die niet in onze configuratie zit)
  - Werksoorten die wel project_type hebben maar geen Project Template-koppeling
- Responsive gedrag voor de aanmaak-wizard (5D)
- ESC en klik-buiten-sluit voor de aanmaak-wizard
- Documenteer in README:
  - Hoe de migratie werkt
  - Hoe een aannemer een eigen Project Type toevoegt in ERPNext (en welke beperkingen daar staan tot Bouwmeester-styling er aan toegevoegd is)
  - De `custom_werksoort`-deprecation

*Commit: `ronde 5j: polish + edge cases`*
*STOP: Eelke beslist over Pull Request en merge.*

---

## EXPLICIET BUITEN SCOPE

Niet doen, ook niet "even snel":

- **Sub-Tasks toevoegen aan Project Templates.** RONDE 5 doet alleen fase-Tasks. Sub-Task-templates zijn latere ronde-onderwerp
- **`custom_werksoort` echt verwijderen.** Het veld blijft als legacy-fallback bestaan tot RONDE 6 of later, na grondig live-getest
- **UI om Project Types te beheren binnen Bouwmeester.** Beheer gebeurt via ERPNext zelf, dat is het hele punt van de architectuur-keuze
- **Andere placeholder-tabs invullen** (Calculatie/Financieel/Uren/Materialen/Documenten/Opleverpunten)
- **Bemensingsoverzicht** (kandidaat latere ronde)
- **Customer Address-migratie / `custom_address` cleanup** (known limitation RONDE 3)
- **Project User-permissie-fix via REST API** (known limitation RONDE 3)
- **Donker-modus** (Y-App heeft geen thema-systeem)

---

## OMGANG MET AFWIJKINGEN

Conform werkpatroon: bij afwijkingen van deze spec **bewust afwijken en documenteren** als known limitation in README, niet stilletjes accepteren. Nieuwe inzichten tijdens de ronde die buiten scope vallen: noteren in een lijst voor latere rondes, niet ter plekke implementeren.

Stop-momenten zijn voor Eelkes visuele verificatie, niet voor "code-verified" zelfcheck. **STOP betekent stoppen — geen commit, geen verder werk.**

---

## TWEE KANTTEKENINGEN UIT HET ONTWERPGESPREK

Eelke wil bij implementatie van de werksoort-config-mapping bewust zijn van:

1. **Toekomstige uitbreidbaarheid.** Het datamodel in `werksoort-config.ts` moet uitbreidbaar zijn voor velden die er nog niet zijn maar later kunnen komen (eigen KPI-meeteenheden, eigen widgets, eigen documentmappen). Gebruik een open object-structuur met optionele velden, geen rigide enum-set.

2. **Vluchtroute richting ERPNext-config.** Als blijkt dat aannemers de werksoort-config willen aanpassen (KPI's toevoegen, palet wijzigen), kan de mapping op termijn migreren naar custom fields op Project Type. Het datamodel moet die overgang faciliteren, niet blokkeren.

Geen actie op deze twee nu — het zijn ontwerp-criteria voor 5A's datamodel.

---

## REFERENTIE-VRAGEN VOOR JEZELF TIJDENS BOUWEN

Als je twijfelt of iets goed gaat, leg het tegen deze vragen:

1. Voeg ik een custom field toe? Stop. Waarom is dit niet via ERPNext-native?
2. Schrijf ik logica die Frappe al doet? Stop. Wat heeft Frappe hiervoor?
3. Hardcode ik iets dat per werksoort verschilt? Stop. Hoort dit in `werksoort-config.ts`?
4. Maak ik aannames over één werksoort? Stop. Werkt mijn code voor alle vijf én voor onbekende werksoorten?
5. Is `custom_werksoort` nog ergens nodig? Stop. Lees ik alleen, of schrijf ik per ongeluk nog?

---

## ORIËNTATIE VOOR START

Bevestig in volgorde:
1. **Feature branch `ronde-5-werksoort-templates` aangemaakt** vanaf `main` en checked out. Toon `git status` en `git branch --show-current`.
2. **Architectuur-principe in eigen woorden**: waarom geen nieuwe custom fields, waarom Project Type/Project Template, waarom configuratie in code.
3. **De vijf werksoorten en hun bestaande fase-sets** (voor zover ik die heb gespecificeerd in 5B). Zie je hiaten in mijn fase-naamgeving die een bouw-expert zou aanvechten?
4. **Welke installatie-scripts er gebouwd worden in 5A en 5B**, en hoe ze idempotent gemaakt worden.
5. **Met welke sub-fase (5A) je begint.**

Dan wachten op groen licht voor 5A.
