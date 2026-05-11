# CLAUDE CODE KICKOFF — RONDE 4

**Project:** Bouwmeester (Y-App extensie voor aannemersbedrijven op ERPNext)
**Repo:** `/home/eelke/Documenten/Github/Y-App/bouwmeester`
**Live:** https://Dollee-404.github.io/bouwmeester/
**Test-omgeving:** Drechtsteden Bouw B.V. via Y-App
**Uitgangspunt:** RONDE 3 (incl. 3G-polish) is volledig afgesloten, commit `a47f8f1`

---

## GIT-WORKFLOW — FEATURE BRANCH

Deze ronde wordt gebouwd op een eigen feature branch, niet direct op `main`. `main` blijft de laatste stabiele release tot RONDE 4 helemaal af is.

**Aan het begin van de ronde (vóór 4A):**
```bash
git checkout main
git pull
git checkout -b ronde-4-planning-tab
```

**Tijdens de ronde:**
- Werk uitsluitend op `ronde-4-planning-tab`
- Commit aan het einde van élke sub-fase (4A, 4B, ... 4G), vóór het stop-moment
- Commit-bericht-formaat: `ronde 4[letter]: korte beschrijving`
  - Voorbeeld: `ronde 4a: data-laag (custom fields, werkbare-dagen-helper, kritieke-pad)`
  - Voorbeeld: `ronde 4d: tijdlijn (mini-gantt met fase-balken en zoom)`
- Push de branch naar GitHub na elke commit zodat Eelke de tussenstaat kan inzien indien gewenst:
  ```bash
  git push -u origin ronde-4-planning-tab  # alleen eerste keer
  git push                                  # daarna
  ```

**Aan het einde van de ronde (ná groen licht op 4G):**
```bash
git checkout main
git merge ronde-4-planning-tab
git push origin main
git branch -d ronde-4-planning-tab
git push origin --delete ronde-4-planning-tab
```

**Belangrijk:**
- De live URL (`https://Dollee-404.github.io/bouwmeester/`) wordt gebouwd vanaf `main`. Tijdens RONDE 4 blijft de live versie dus de RONDE 3-eindstaat. Pas na de eind-merge wordt de nieuwe Planning-tab live.
- Wijk niet stilletjes af van de branch (dus géén directe commits op `main` tussendoor, ook niet voor "even een typfoutje").
- Als er onverwacht een hotfix op `main` moet, stem dat eerst af met Eelke; dan kan via cherry-pick of een aparte hotfix-branch.

---

## SCOPE RONDE 4 — De Planning-tab functioneel maken

In het Project-detailpaneel zijn nu acht tabs zichtbaar, waarvan alleen "Overzicht" werkt. Deze ronde maken we de **Planning-tab** volledig functioneel. De overige zes placeholder-tabs blijven deze ronde ongewijzigd.

De Planning-tab is bedoeld voor een ervaren projectleider die 's ochtends in de bouwkeet in 30 seconden wil weten: *lopen we voor of achter, wat moet ik deze week aansturen, en hoe zit het project er als geheel uit?*

---

## OPBOUW VAN DE PLANNING-TAB

Drie horizontale stroken van algemeen naar specifiek. Geen dichte dashboard-rasters; typografische hiërarchie doet het zware werk.

### Strook 1 — Situatieregel + mini-tijdsstrook

**Doel:** in twee seconden weten waar het project staat.

- Eén regel in mensentaal, bijvoorbeeld:
  *"Project loopt 3 werkbare dagen achter. Volgende mijlpaal: oplevering ruwbouw over 8 werkdagen."*
- Eén accent-streep links (rood/oranje/groen) afhankelijk van situatie:
  - Groen: op schema of voor
  - Oranje: 1-5 werkbare dagen achter
  - Rood: meer dan 5 werkbare dagen achter, of oplevering al overschreden
- Daaronder een mini-tijdsstrook (sparkline-achtig, één regel hoog, géén interactie):
  - Horizontale balk: start project → oplevering
  - Vandaag-stip
  - Mijlpalen als kleine ruitjes
  - Subtiele kleurzone voor "afgelopen" vs "te gaan"

**Werkbare dagen-rekenmodel:**
- Standaard: ma t/m vr, geen feestdagen (NL feestdagen-set; gebruik een lichtgewicht statische lijst voor 2025-2027, géén externe API)
- Als `custom_weersafhankelijk = true`: pas het werkbare-dagen-getal niet automatisch aan op weer (geen weerdata in deze ronde), maar toon in de situatieregel een subtiele indicator: *"weersafhankelijk project"*. Latere ronde kan hier weersdata aan koppelen.

### Strook 2 — Werkvoorraad ("wat doet er deze week toe")

**Doel:** maximaal 5-7 items die deze projectleider deze week moet aansturen.

**Tijdvenster:** rollende week (maandag t/m zondag van de huidige weeknummer).

**Selectie-logica:** een Task valt in de werkvoorraad als één of meer van het volgende geldt:
1. Geplande startdatum valt deze week
2. Geplande einddatum valt deze week
3. Geplande einddatum is in het verleden én status ≠ "Completed/Cancelled" (achterstallig)
4. Status = "Open" en alle Tasks waar deze van afhankelijk is (`depends_on`) zijn afgerond én startdatum is deze week of eerder
5. Mijlpaal binnen 14 dagen vanaf vandaag

Toon maximaal 7 items, gesorteerd op urgentie (achterstallig → start vandaag → start deze week → mijlpaal nabij). Als er meer dan 7 zijn, toon een onopvallende "+N meer" link onderaan (klik = uitklappen, geen aparte pagina).

**Per item zichtbaar:**
- Korte titel (Task subject), één regel
- Eén tag die uitlegt *waarom* dit op de lijst staat:
  - "achterstallig"
  - "start vandaag" / "start morgen" / "start [dag]"
  - "klaar vóór [dag]"
  - "mijlpaal over Xd"
  - "wacht op materiaal" / "wacht op weer" / etc. (alleen bij waiting state)
- Toegewezen persoon (Frappe `_assign`, JSON-parsed) — toon eerste persoon, of "n.t.b." als leeg
- Discrepantie-indicator (subtiel): als bestede uren ≥ 80% van geschatte uren én voortgang < 80%, toon klein "uren-loopt-uit"-icoon rechts
- Klik op item: opent het inline detail-paneel (zie verderop)

**Visueel:** rijen of cards met flink wat lucht, géén tabel-met-kolomkoppen. Toegewezen persoon als avatar-cirkel met initialen (geen profielfoto's deze ronde). Eén accentkleur per tag-type, terughoudend.

### Strook 3 — Tijdlijn (mini-Gantt)

**Doel:** het project als geheel zien, context voor de werkvoorraad.

**Standaard zoom bij openen:** maand rond vandaag (2 weken terug, 2 weken vooruit). Drie zoom-knoppen: **Week** / **Maand** / **Heel project**. Géén continue zoom-slider.

**Inhoud van de tijdlijn:**
- Rijen per fase (gebruik de fases zoals al gedefinieerd in de Fases-sectie van Overzicht-tab). Sub-Tasks worden binnen de fase samengevoegd in de fase-balk; toon Tasks niet individueel als balken in deze ronde — dat is visueel te druk.
- Per fase:
  - **Geplande baseline** als zachte schaduw/lichtgrijze achtergrondbalk (gepland startdatum → gepland einddatum, of bij ontbreken: afgeleid uit Tasks binnen de fase)
  - **Werkelijke voortgang** als gevulde balk bovenop, voortgang gebaseerd op `percent_complete` of geaggregeerd over Tasks
  - Als werkelijke einddatum buiten geplande baseline valt: de balk steekt zichtbaar uit aan de rechterkant
- Mijlpalen als ruitjes op de tijdas (boven de fase-rijen, op eigen "milestone"-rij)
- Vandaag als verticale streep met zeer subtiele achtergrond-band
- Weekends in maandweergave: lichte achtergrond-arcering om werkbare vs niet-werkbare dagen te onderscheiden
- NL-feestdagen: kleine markering op de tijdas

**Kritieke pad:** als een fase op het kritieke pad ligt (alle Tasks binnen die fase hebben `is_group=0` en aaneengesloten `depends_on`-ketens tot de oplevering), markeer de balk met een dikkere onderlijn of accent-kleur. Geen aparte legenda; de visuele markering is genoeg.

**Klik op fase-balk:** zelfde inline detail-paneel als bij werkvoorraad-items, maar dan met fase-context (Tasks binnen die fase als sub-lijst).

---

## INLINE DETAIL-PANEEL

Bij klik op een werkvoorraad-item of fase-balk: een paneel verschijnt rechts of onderaan (afhankelijk van schermbreedte — kies wat past bij het al bestaande adaptieve gedrag van het hoofdpaneel: rechter side-panel bij ≥1280px, bottom-sheet bij <1280px).

**Inhoud paneel (lezen-only deze ronde, geen edit):**
- Task/fase titel + status
- Toegewezen persoon/personen (volledige lijst, niet alleen eerste)
- Geplande start/eind + werkelijke start/eind
- Voortgang (percent_complete) + bestede uren / geschatte uren
- Beschrijving (Task `description`, indien aanwezig)
- "Wacht op…"-status indien gezet (zie volgende sectie)
- Afhankelijkheden: lijst van Tasks waar dit van afhangt (`depends_on`), met hun status. Klik op een afhankelijkheid = verspring binnen het detail-paneel naar die Task.
- Onderaan: knop **"Open in ERPNext"** — opent de Task in een nieuw tabblad

**Géén inline editing in deze ronde.** Latere ronde voegt dit toe.

---

## "WACHT OP…"-STATUSSEN — CUSTOM FIELDS

Nieuwe custom fields op het Task-doctype (toevoegen aan de installatie-routine, naar analogie van bestaande `custom_werksoort` etc.):

| Veld | Type | Opties / details |
|---|---|---|
| `custom_wacht_op` | Select | Leeg / Voorgaande taak / Weer / Vergunning of keuring / Onderaannemer / Materiaal / Anders |
| `custom_wacht_op_toelichting` | Small Text | Optioneel, alleen relevant als `custom_wacht_op = "Anders"` |

**Logica:**
- "Wacht op voorgaande taak" kan ook automatisch worden afgeleid uit `depends_on` als een open Task afhankelijk is van een nog-niet-afgeronde Task. Toon deze als automatische tag, óók als `custom_wacht_op` leeg is. Als de gebruiker handmatig een andere waarde heeft gezet, gaat die voor.
- In de werkvoorraad-tag: als `custom_wacht_op = "Anders"`, toon de toelichting als tag-tekst. Beperk weergave tot ~25 tekens, tooltip voor volledige tekst.
- In het inline detail-paneel: toon de status met toelichting indien aanwezig.

**Géén filter-UI deze ronde** om op wacht-status te filteren — dat is voor later. De statussen zijn zichtbaar maar niet handmatig instelbaar vanuit Bouwmeester (alleen via ERPNext). Dit beperkt de scope.

---

## VISUELE TAAL (samenvatting voor consistentie)

- Rustige typografie als hoofdmiddel. Grote getallen voor wat ertoe doet. Twee à drie groottes per strook.
- Eén accentkleur voor "let op", één voor "klaar", de rest grijswaarden. Geen status-regenboog.
- Donker-mode moet expliciet werken; test gepland-vs-werkelijk-balken in beide modi.
- Whitespace > densiteit. Geen 12px-rijhoogtes.
- Iconen alleen waar woorden te lang worden. Knoppen met labels.
- Subtiele transities bij zoom-wissel in tijdlijn. Geen "wow"-animaties.

---

## DATA-LAAG

Vrijwel alles staat al klaar. Aanvullingen die nodig zijn:

**Project-detail-service uitbreiding:**
- `getProjectMilestones(projectId)` — Tasks met `is_milestone=1`, gesorteerd op datum
- `getProjectWorkingDays(startDate, endDate)` — helper voor werkbare-dagen-berekening, gebaseerd op statische NL-feestdagen lijst 2025-2027
- `getCriticalPath(projectId, tasks)` — berekent welke fases op het kritieke pad liggen op basis van `depends_on`-ketens

**Bestaande methoden hergebruiken:**
- `getProjectTasks` — al voorhanden, levert Tasks met parent-fase
- `getProjectTimesheets` — voor uren-aggregatie per Task/fase
- `getProjectDetail` — voor `expected_start_date`, `expected_end_date`, etc.

**Custom fields installatie:**
- Voeg `custom_wacht_op` en `custom_wacht_op_toelichting` toe aan de bestaande custom-fields-installatieroutine (analoog aan eerdere ronden). Documenteer ze in README.

---

## FASERING + STOP-MOMENTEN

Eelke wil per sub-fase visueel verifiëren voor we doorgaan. Werk in deze volgorde:

**4A — Data-laag**
Custom fields installeren, service-methoden uitbreiden, werkbare-dagen-helper, kritieke-pad-berekening. Geen UI. Lever af: unit-tests of voorbeeld-uitvoer in console waar je laat zien dat de helpers correct werken op een testproject.
*Commit: `ronde 4a: data-laag (custom fields, werkbare-dagen-helper, kritieke-pad)`*
*STOP: Eelke verifieert dat data correct uit ERPNext komt.*

**4B — Strook 1: situatieregel + mini-tijdsstrook**
Statisch eerst met dummy-data, dan aangesloten op data-laag. Inclusief accent-streep en weersafhankelijkheid-indicator.
*Commit: `ronde 4b: situatieregel + mini-tijdsstrook`*
*STOP: Eelke verifieert visueel + leesbaarheid van de zin in verschillende situaties (achterstand / op schema / voor / overschreden).*

**4C — Strook 2: werkvoorraad**
Eerst met dummy-data 7 items, alle tag-types. Dan selectie-logica aansluiten. Daarna `_assign`-parsing en discrepantie-indicator.
*Commit: `ronde 4c: werkvoorraad-strook`*
*STOP: Eelke verifieert dat de juiste items in de juiste volgorde verschijnen.*

**4D — Strook 3: tijdlijn (Gantt)**
Eerst statische SVG/canvas-rendering met dummy-fases, dan zoom-niveaus, dan data aansluiten, dan kritieke pad. Mijlpaal-ruitjes en vandaag-streep.
*Commit: `ronde 4d: tijdlijn (mini-gantt met fase-balken en zoom)`*
*STOP: Eelke verifieert visueel in alle drie zoom-niveaus.*

**4E — Inline detail-paneel**
Verschijnt bij klik op werkvoorraad-item én fase-balk. Adaptief (rechter side-panel ≥1280px, bottom-sheet daaronder). Inclusief afhankelijkheden-navigatie.
*Commit: `ronde 4e: inline detail-paneel`*
*STOP: Eelke verifieert flow tussen werkvoorraad → detail → afhankelijkheid → detail.*

**4F — "Wacht op…"-integratie**
Custom fields gebruiken in werkvoorraad-tags en detail-paneel. Automatische "wacht op voorgaande taak"-detectie uit `depends_on`.
*Commit: `ronde 4f: wacht-op-statussen integreren`*
*STOP: Eelke verifieert door in ERPNext handmatig `custom_wacht_op` te zetten en de UI te checken.*

**4G — Polish + edge cases**
Lege staten (geen Tasks, geen mijlpalen, geen werkvoorraad deze week), donker-mode pass, responsief gedrag (drawer/overlay/fullpage), i18n voor alle nieuwe strings (NL + EN).
*Commit: `ronde 4g: polish + edge cases`*
*STOP: Eelke beslist over merge naar `main` en release.*

**Na groen licht op 4G — merge:**
```bash
git checkout main
git merge ronde-4-planning-tab
git push origin main
git branch -d ronde-4-planning-tab
git push origin --delete ronde-4-planning-tab
```
Bevestig daarna kort dat de merge geslaagd is en dat de live URL bijgewerkt is (of bij gebruik van een GitHub Action: dat de build draait).

---

## EXPLICIET BUITEN SCOPE

Niet doen, ook niet "even snel":

- Andere placeholder-tabs invullen (Calculatie, Financieel, Uren, Materialen, Documenten, Opleverpunten)
- Bemensingsoverzicht ("wie wanneer op deze klus") — kandidaat voor latere ronde
- Inline editing van Task-velden — alle wijzigingen gaan via "Open in ERPNext"-knop
- Filter-UI op werkvoorraad of tijdlijn
- Weersdata koppelen aan weersafhankelijke projecten
- Customer Address-migratie / `custom_address` cleanup (known limitation, latere ronde)
- Project User-permissie-fix via REST API (known limitation)
- Project aanmaken via Bouwmeester (known limitation)
- Drag-and-drop op tijdlijn-balken
- Task aanmaken / verwijderen vanuit Bouwmeester
- Comments schrijven (alleen lezen)
- Notificaties / push-meldingen bij achterstand

---

## OMGANG MET AFWIJKINGEN

Conform werkpatroon uit eerdere ronden: bij afwijkingen van deze spec **bewust afwijken en documenteren** als known limitation in README, niet stilletjes accepteren. Nieuwe inzichten tijdens de ronde die buiten scope vallen: noteren in een lijst voor latere ronden, niet ter plekke implementeren.

Stop-momenten zijn voor Eelkes visuele verificatie, niet voor "code-verified" zelfcheck.

---

## BESLUITEN GENOMEN TIJDENS RONDE 4

### Donkermodus — bewust uit scope (besloten sub-fase 4B)

De kickoff-spec vermeldde donker-mode als vereiste (regels 174, 235, 286). Na onderzoek van de Y-App bridge-architectuur is dit besluit herzien:

**Bevinding:** Y-App stuurt geen thema-informatie naar extensie-iframes. De iframe-URL ontvangt uitsluitend `host`, `instance`, `erpUrl`, `lang`. Er bestaat geen dark/light-mode signaal, geen CSS-variabele-injectie, geen postMessage-event voor thema. Y-App heeft in productie geen dark mode toggle; het "thema" is uitsluitend een per-instance accentkleur voor de tab-indicator.

**Gevolg:** De `@custom-variant dark`-variant in `index.css` en alle `dark:`-klassen in Bouwmeester-componenten zijn dode code — ze activeren nooit in productie omdat de `.dark`-klasse nergens gezet wordt.

**Besluit:** Donkermodus volledig uit scope voor alle RONDE 4-sub-fasen. Alle `dark:`-klassen zijn verwijderd, de `@custom-variant dark`-definitie is verwijderd. Als Y-App ooit dark mode introduceert, sturen ze een nieuwe URL-param — dat is het moment voor een aparte ronde.

---

## REFERENTIE-VRAGEN VOOR JEZELF TIJDENS BOUWEN

Als je twijfelt of iets goed gaat, leg het tegen deze vragen:

1. Kan een projectleider met 30 jaar ervaring binnen 2 seconden zien hoe het project ervoor staat?
2. Is wat hij of zij deze week moet aansturen direct zichtbaar zonder filteren of zoeken?
3. Voelt het scherm rustig of druk? Druk = fout.
4. Is er informatie zichtbaar die niet ertoe doet voor de dagelijkse aansturing? Verwijderen.
5. Werkt dit in een bouwkeet om 6:15 in december op een telefoon met zonlicht erop? Donker-mode + grote tap-targets.

---

## ORIËNTATIE VOOR START

Bevestig in volgorde:
1. **Feature branch `ronde-4-planning-tab` aangemaakt** vanaf `main` en checked out. Toon de output van `git status` en `git branch --show-current`.
2. Drie horizontale stroken + inline detail-paneel — herhaal de opbouw kort in eigen woorden
3. Welke nieuwe service-methoden moet je bouwen, en welke bestaande hergebruik je
4. Welke nieuwe custom fields installeer je op Task-doctype
5. Met welke sub-fase (4A) je begint

Dan wachten op groen licht voor 4A.
