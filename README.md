# Bouwmeester

Y-App extensie waarmee aannemers hun ERPNext-projecten beheren via een kanban-board of tabelweergave.

## Wat doet Bouwmeester

Bouwmeester toont ERPNext-projecten in zes statuskolommen (Aanvraag, Calculatie, Gegund, In uitvoering, Oplevering, Afgerond) plus twee archiefstatussen (Verloren, Geannuleerd). Je versleept kaarten tussen kolommen om de status direct in ERPNext bij te werken. Naast het kanban-board is er een tabelweergave met sorteren en werksoort-filter, en je zoekt op projectnaam of klantnaam. De interface is volledig keyboard-toegankelijk en schakelt automatisch naar een compacte kaartweergave op smalle schermen.

## Vereisten

- Een draaiende [Y-App](https://github.com/OpenAEC-Foundation/Y-app) instance
- Een ERPNext instance gekoppeld aan Y-App
- System Manager rechten in ERPNext voor de eerste installatie (of een beheerder die het installatiebestand importeert — zie Stap 2)

Bouwmeester heeft geen eigen ERPNext-credentials. Alle data loopt via de Y-App bridge.

## Installatie

### Stap 1 — Registreer Bouwmeester in Y-App

Open in Y-App: **Instellingen → Extensions** (Engelstalig: Settings → Extensions).

Onder de sectie **Geavanceerd / Ontwikkelaar**:

1. Vul de URL in: `https://Dollee-404.github.io/bouwmeester/`
2. Sla op

Bouwmeester verschijnt nu in de sidebar onder Projecten als 'Bouwmeester (ext)'.

> **Toekomstige plaatsing.** De 'Geavanceerd / Ontwikkelaar'-sectie is bedoeld voor lokale ontwikkeling en pre-release builds. Voor permanente installatie kan Bouwmeester worden aangemeld bij de Y-App-beheerders voor opname in de extensie-catalogus.

### Stap 2 — Eerste opening: custom fields installeren

Bij de eerste keer openen detecteert Bouwmeester welke custom fields nog ontbreken op het Project-doctype en biedt aan deze te installeren.

**Als je System Manager bent:** klik op "Installeer velden". De 6 velden worden automatisch aangemaakt.

**Als je geen System Manager bent:** download het installatiebestand en stuur het naar je ERPNext-beheerder. Die importeert het via Customize Form → Import. Klik daarna op "Controleer opnieuw".

### Stap 3 — Projecten aanmaken

Maak projecten aan via ERPNext (Project doctype). Bouwmeester is een visualisatie- en statusbeheer-laag; data-entry voor nieuwe projecten gaat via ERPNext.

Koppel een Sales Order aan een project om de budgetregel op de kaart te activeren.

## Custom fields

Bouwmeester voegt 6 velden toe aan het Project-doctype in ERPNext:

| Veld | Type | Opties / Toelichting |
|------|------|----------------------|
| `custom_bouwmeester_status` | Select | Aanvraag, Calculatie, Gegund, In uitvoering, Oplevering, Afgerond, Verloren, Geannuleerd |
| `custom_werksoort` | Select | Renovatie, Nieuwbouw, Sloop, Verbouw, Onderhoud, (leeg) |
| `custom_budget_hours` | Float | Budget in uren |
| `custom_project_manager` | Link → User | Wordt intern nog gebruikt als databron voor de kanban- en tabelweergave (`projectLeader` op het `Project`-type). Directe queries op `Project User` als child-doctype werken niet betrouwbaar via de Y-App bridge (Frappe-permissies). Dit veld wordt leeggemaakt in 3F-vervolg nadat alle installaties zijn gemigreerd en de bridge het child-doctype kan bevragen. |
| `custom_address` | Small Text | Legacy. Projectadres wordt nu gelezen uit `Customer.customer_primary_address`. Dit veld wordt nog als fallback gebruikt in het detailpaneel totdat alle klanten een Customer Address hebben in ERPNext. |
| `custom_weersafhankelijk` | Check | Markeert weersafhankelijke projecten |

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

## Known limitations

1. **Project aanmaken via Bouwmeester is nog niet beschikbaar.** Maak projecten aan via ERPNext. Gepland voor een volgende versie.
2. **Budgetregel verschijnt alleen bij projecten met een gelinkte Sales Order.** Zonder gekoppelde Sales Order toont de kaart geen budget of voortgangsbalk.
3. **`Project User` child-doctype niet betrouwbaar via REST API.** Frappe-permissies en URL-encodingproblemen (spatie in doctype-naam) maken directe queries op de `Project User`-kindtabel via de Y-App bridge onbetrouwbaar. Bouwmeester valt daardoor terug op het legacy `custom_project_manager`-veld voor projectleider-data in de projectenlijst. Een toekomstige ronde moet ofwel de Frappe-permissies voor child-doctypes oplossen, ofwel een server-side endpoint bouwen dat Project Users betrouwbaar levert — pas dan kan `custom_project_manager` worden leeggemaakt.
4. **`custom_address` fallback actief in detailpaneel.** Zolang klanten nog geen `customer_primary_address` hebben in ERPNext, valt het detailpaneel terug op `custom_address`. De fallback wordt verwijderd in 3F-vervolg, na vulling van de Customer Addresses.
5. **Instance-switch is niet uitgebreid getest.** Bouwmeester is gebouwd voor multi-instance Y-App setups, maar onze testomgeving had slechts één ERPNext-instance. Wissel je in Y-App tussen instances, dan laadt Bouwmeester de data van de actieve instance opnieuw. Meld afwijkend gedrag via de issue tracker.
6. **Sanering StatusFlow is vereenvoudigd tot 6 stappen.** De ideale flow (Aanvraag → Onderzoek → Calculatie → Gegund → Sanering → Vrijgave → Afgerond, 7 stappen) vereist twee nieuwe ERPNext-statuswaarden. De huidige implementatie hernoemt bestaande statussen: "Calculatie" verschijnt als "Onderzoek", "In uitvoering" als "Sanering", "Oplevering" als "Vrijgave". Een volledige 7-staps-flow is gepland voor een latere ronde na ERPNext-schema-uitbreiding.

## Voor ontwikkelaars

### Stack

| | |
|---|---|
| Framework | React 19 + TypeScript |
| Styling | Tailwind CSS 4 (CSS-first config) |
| Drag-and-drop | @dnd-kit/core + @dnd-kit/sortable |
| i18n | i18next + react-i18next |
| Icons | lucide-react |
| Build | Vite 8 |
| Deploy | GitHub Actions → GitHub Pages |

### Lokaal draaien

```bash
git clone https://github.com/Dollee-404/bouwmeester.git
cd bouwmeester
npm install
npm run dev    # start op http://localhost:5200
```

Zonder Y-App-context draait automatisch een mock-service met 15 voorbeeldprojecten. Je hebt geen Y-App- of ERPNext-toegang nodig voor lokale ontwikkeling.

### Mock-URL's voor wizard testen

| URL | Effect |
|-----|--------|
| `http://localhost:5200/?mock=wizard` | Wizard met alle 6 velden als ontbrekend |
| `http://localhost:5200/?mock=noperm` | No-permission scherm (geen System Manager) |

### Bridge-architectuur

Bouwmeester draait als sandboxed iframe in Y-App. Communicatie met ERPNext verloopt uitsluitend via `postMessage` RPC naar de Y-App parent — Bouwmeester heeft zelf geen ERPNext-credentials en doet geen directe API-aanroepen. De bridge-laag zit in `src/bridge/index.ts` en heeft een timeout van 30 seconden per aanroep. Zie `src/bridge/README.md` voor gebruiksvoorbeelden.

### Console errors van Y-App

Bouwmeester deelt zijn console met Y-App. Y-App doet zelf in de achtergrond verschillende ERPNext-API-aanroepen die niets met Bouwmeester te maken hebben. Sommige hiervan kunnen falen op bepaalde ERPNext-setups en verschijnen daardoor ook in Bouwmeester's DevTools. Filter op `bouwmeester` in de stack trace om Bouwmeester-specifieke errors te isoleren.

Bekende Y-App background-fetches die kunnen falen:
- `GET /api/resource/Project` → 417
- `GET /api/resource/Leave Application` → 404 (HR-module niet actief)
- `GET /api/resource/Task` → 417

Dit zijn bugs in Y-App's DataContext, niet in Bouwmeester.

### Live demo

`https://Dollee-404.github.io/bouwmeester/` — toont mock-data buiten Y-App context (geen `instance` URL-parameter aanwezig). Voor productiegebruik: registreer als Y-App extensie via Stap 1 hierboven.

Issues en suggesties zijn welkom op [github.com/Dollee-404/bouwmeester/issues](https://github.com/Dollee-404/bouwmeester/issues).
