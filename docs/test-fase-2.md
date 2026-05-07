# End-to-end testchecklist — Fase 2: Setup Wizard

Deze checklist test de wizard in een échte Y-App + ERPNext omgeving.
Verwachte tijdsduur: 20–30 minuten.

Vereisten:
- Lokale Y-App draait op http://localhost:5173
- Lokale ERPNext-instance bereikbaar via Y-App (instance ingelogd)
- Bouwmeester dev-server draait op http://localhost:5200
- Je hebt System Manager rechten op de ERPNext-instance

---

## VOORBEREIDING

### Stap 1 — Controleer of custom fields al bestaan

Optie A — via ERPNext UI:
1. Open ERPNext in de browser (directe URL, niet via Y-App)
2. Ga naar: Setup → Customize Form → kies doctype "Project"
3. Zoek in de veldlijst naar:
   - `custom_bouwmeester_status`
   - `custom_werksoort`
   - `custom_budget_hours`
   - `custom_weersafhankelijk`
4. Als geen van deze vier aanwezig is: velden bestaan niet → ga naar Stap 3
5. Als één of meer aanwezig zijn: noteer welke → ga naar Stap 2

Optie B — via ERPNext lijst:
- Ga naar: Setup → Custom Field → filter op "Project" als DocType
- Zoek op `custom_bouwmeester` en `custom_werksoort`

### Stap 2 — Verwijder bestaande Bouwmeester-velden (alleen als ze bestaan)

⚠️ Doe dit alleen als de velden er al staan én je ze handmatig wilt testen.
Als ze automatisch door Bouwmeester zijn aangemaakt: verwijder ze gerust.
Als ze handmatig bestonden vóór Bouwmeester: noteer de waarden en zet ze na de test terug.

Per veld in Custom Field lijst:
1. Open het veld → klik "Delete"
2. Bevestig de verwijdering
3. Herhaal voor alle 4 velden

Na verwijdering: verifieer in Customize Form → Project dat de velden weg zijn.

### Stap 3 — Registreer Bouwmeester in Y-App (als nog niet gedaan)

1. Open Y-App → Settings (tandwiel) → Extensions → Geavanceerd
2. Voeg toe:
   - Naam: `Bouwmeester`
   - URL: `http://localhost:5200/`
3. Sla op

---

## WIZARD-FLOW TESTEN

### Stap 4 — Scherm 1: Controleer de detectie

1. Open Y-App → klik Bouwmeester in de sidebar
2. Verwacht: loading-indicator verschijnt kort (< 2 seconden)
3. Verwacht: daarna het welkomstscherm met titel en 4 veldnamen
4. Open browser DevTools (F12) → Console → zoek naar:
   `[bouwmeester] checkRequiredFields: Xms`
   Noteer de tijd. Onder 500ms = prima. Boven 1500ms = noteer als bevinding.

Definition of done: welkomstscherm zichtbaar met alle 4 velden en "Installeer velden" knop.

### Stap 5 — Scherm 2A: Installatie doorlopen (System Manager)

1. Klik "Installeer velden"
2. Verwacht: installing-scherm verschijnt met 4 rijen, elk met spinner
3. Verwacht: per veld verschijnt een groen vinkje zodra het geïnstalleerd is
4. Verwacht: na het 4e vinkje verschijnt "Installatie geslaagd!" en na ±1 seconde laadt de app

Definition of done: alle 4 vinkjes groen, app laadt vanzelf.

### Stap 6 — Verifieer in ERPNext dat de velden bestaan

1. Ga naar ERPNext → Customize Form → Project
2. Controleer aanwezigheid van:
   - [ ] `custom_bouwmeester_status` — type Select, opties Lead/Calculatie/Gegund/In uitvoering/Oplevering/Afgerond
   - [ ] `custom_werksoort` — type Select
   - [ ] `custom_budget_hours` — type Float
   - [ ] `custom_weersafhankelijk` — type Check

Definition of done: alle 4 velden aanwezig met correct type.

### Stap 7 — Eindcheck: wizard wordt overgeslagen bij heropen

1. Herlaad Bouwmeester in Y-App (refresh de pagina, of klik weg en terug)
2. Verwacht: loading-indicator kort zichtbaar, dan direct de testpagina (App inhoud)
3. Verwacht: geen wizard-scherm meer

Definition of done: wizard verschijnt niet meer bij heropen.

---

## REFRESH-ROBUUSTHEID

### Stap 8 — Verwijder de velden opnieuw (voorbereiding refresh-test)

Herhaal Stap 2 om de 4 velden te verwijderen.

### Stap 9 — Refresh midden in de installatie

1. Open Bouwmeester → welkomstscherm verschijnt
2. Klik "Installeer velden"
3. Wacht totdat het eerste of tweede vinkje zichtbaar is
4. Vernieuw de pagina (F5) midden in de installatie
5. Verwacht: wizard start opnieuw met detectie
6. Verwacht: al geïnstalleerde velden worden niet opnieuw aangemaakt (idempotentie)
7. Klik opnieuw "Installeer velden" → alleen de nog-niet-geïnstalleerde velden worden aangemaakt
8. App laadt na voltooiing

Definition of done: geen dubbele Custom Fields na refresh + herinstallatie.
Verifieer in ERPNext: elk veld bestaat precies één keer.

---

## NIET-SYSTEM-MANAGER FLOW

### Stap 10 — Test via mock-mode (zonder tweede gebruiker)

Echte niet-System-Manager test vereist een tweede ERPNext-gebruiker zonder die rol.
Als dat niet beschikbaar is, gebruik de mock-mode als verificatie van de UI-flow:

1. Open: `http://localhost:5200/?mock=noperm`
2. Verwacht: welkomstscherm → klik "Installeer velden" → no-permission scherm
3. Controleer aanwezigheid van:
   - [ ] Titel "Vraag je beheerder om hulp"
   - [ ] Uitleg over ontbrekende rechten
   - [ ] "Download installatiebestand" knop
   - [ ] "Stuur naar beheerder" knop (opent mailto:)
   - [ ] "Ik heb dit gedaan, controleer opnieuw" knop

Definition of done (mock): alle drie knoppen zichtbaar en klikbaar.

Als wél een tweede gebruiker beschikbaar is:
1. Log in op ERPNext als gebruiker zonder System Manager
2. Open Bouwmeester via Y-App (als die gebruiker toegang heeft)
3. Verwacht: no-permission scherm verschijnt automatisch

---

## JSON-FALLBACK TESTEN

### Stap 11 — Download en importeer het JSON-bestand

1. Open `http://localhost:5200/?mock=noperm`
2. Klik "Download installatiebestand"
3. Verwacht: bestand `bouwmeester-custom-fields.json` wordt gedownload
4. Open het bestand in een teksteditor
5. Controleer: is het een JSON-array met 4 objecten?
6. Controleer per object: bevat het `doctype: "Custom Field"` + de juiste `fieldname`?

Optioneel — importeer in ERPNext:
7. Verwijder de 4 velden opnieuw (Stap 2)
8. Ga naar ERPNext → Setup → Custom Field
9. Klik "Import" (rechts bovenin) → upload `bouwmeester-custom-fields.json`
10. Verwacht: 4 velden verschijnen in de lijst
11. Open Bouwmeester opnieuw → wizard wordt overgeslagen

Definition of done JSON: bestand bevat correct formaat met 4 velden.
Definition of done import: optioneel, maar sterk aanbevolen voor volledig groen.

---

## BEVINDINGEN NOTEREN

Na de test: noteer hier wat je hebt gevonden.

| Test | Resultaat | Opmerking |
|------|-----------|-----------|
| Stap 4 — detectie-tijd | | ms |
| Stap 5 — installatie-flow | | |
| Stap 6 — velden in ERPNext | | |
| Stap 7 — heropen zonder wizard | | |
| Stap 9 — refresh idempotentie | | |
| Stap 10 — no-permission mock | | |
| Stap 11 — JSON-download formaat | | |
| Stap 11 — JSON-import in ERPNext | | optioneel |
