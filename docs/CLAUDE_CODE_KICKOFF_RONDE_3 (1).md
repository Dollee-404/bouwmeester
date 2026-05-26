# Claude Code Kickoff — RONDE 3, Fase 3A

Plak deze prompt in een nieuwe Claude Code-sessie om RONDE 3 op te starten.

---

```
We starten RONDE 3 van Bouwmeester. RONDE 2 is volledig afgerond:
- 7 fases (0 t/m 7) doorlopen
- Live op https://Dollee-404.github.io/bouwmeester/
- Geregistreerd in Y-App, end-to-end getest tegen Drechtsteden 
  Bouw ERPNext-instance

Project repo: /home/eelke/Documenten/Github/Y-App/bouwmeester

Vandaag begint RONDE 3 — een nieuw overzichtspaneel dat opent 
wanneer een gebruiker op een ProjectCard klikt. Het paneel toont 
alle relevante project-informatie in één scan-bare weergave.

═══════════════════════════════════════════════════════════════
EERSTE STAP — VOORBEREIDING
═══════════════════════════════════════════════════════════════

Voor je begint:

1. Lees `docs/RONDE_3_OVERZICHTSPANEEL.md` volledig. Dit is het 
   complete planning-document voor RONDE 3, inclusief data-
   architectuur wijzigingen, fase-werkpakketten, en visuele 
   specificaties.

2. Doe `git log --oneline -10` om de recente commits te zien. 
   Verifieer dat de laatste commit van RONDE 2 is.

3. Check `git status` — moet schoon zijn.

4. Bevestig in chat:
   - Welke ronde is afgerond (zou RONDE 2 moeten zijn)
   - Wat is de scope van fase 3A volgens het document
   - Welke twee custom fields moeten in fase 3A toegevoegd worden
   - Wat het migratie-pad is voor `custom_project_manager`

Wijzig nog niets. Wacht op mijn volgende prompt.

═══════════════════════════════════════════════════════════════
SCOPE VAN FASE 3A
═══════════════════════════════════════════════════════════════

Volgens RONDE_3_OVERZICHTSPANEEL.md moet fase 3A:

1. Custom field `custom_role` toevoegen aan Project Users 
   child table via wizard-uitbreiding
   - Type: Select
   - Opties: projectleider, uitvoerder, werkvoorbereider, 
     calculator, anders

2. Custom field `custom_is_meerwerk` toevoegen aan Sales Order 
   via wizard-uitbreiding
   - Type: Check
   - Default: nee

3. Migratie-pad voor `custom_project_manager`: voor elk bestaand 
   project, kopieer de waarde naar Project Users met 
   custom_role = projectleider

4. Migratie-pad voor `custom_address`: waarschuwing in wizard 
   voor projecten zonder customer.primary_address

5. Setup-wizard uitbreiden om de twee nieuwe custom fields te 
   detecteren en installeren

6. Tests dat bestaande Bouwmeester (RONDE 2) niet breekt door 
   de wijzigingen — geen regressie

═══════════════════════════════════════════════════════════════
WAT NIET DOEN
═══════════════════════════════════════════════════════════════

- Niet alvast bridge-uitbreidingen bouwen (dat is fase 3B)
- Niet alvast aan UI-componenten beginnen (dat is fase 3C en 
  later)
- Niet `custom_address` of `custom_project_manager` nu al 
  afschaffen — dat gebeurt pas in fase 3F
- Geen scope-uitbreiding "ik zie ook nog dit" — eerst rapporteren
- Niet zelfstandig vooruit rennen naar fase 3B zonder mijn 
  expliciete akkoord

═══════════════════════════════════════════════════════════════
WERKPATROON
═══════════════════════════════════════════════════════════════

- Stap voor stap, met expliciete bevestiging per onderdeel
- Bij twijfel: vraag, ga niet gokken
- Bij ontdekking van iets onverwachts: meld het, wacht op 
  beslissing
- Visueel bewijs (screenshots, console-output) waar relevant
- Stop voor mijn review aan het einde van fase 3A, voor we 
  doorgaan naar 3B

═══════════════════════════════════════════════════════════════

Begin met de voorbereiding zoals beschreven onder "EERSTE STAP". 
Ik wacht op jouw bevestiging dat je het document hebt gelezen 
en de scope van 3A begrijpt.
```

---

## Wat te doen voor je deze prompt plakt

1. Zorg dat `docs/RONDE_3_OVERZICHTSPANEEL.md` in de repo staat. Kopieer het bestand uit de outputs-map naar `docs/` in je project, en commit het met message:

```
docs: RONDE 3 planning — overzichtspaneel
```

2. Open een verse Claude Code-sessie (geen voortzetting van RONDE 2).

3. Plak de kickoff-prompt hierboven.

4. Wacht op Claude Code's bevestiging dat hij het document heeft gelezen en de scope begrijpt voordat je doorgaat.

## Werkpatroon-tips voor RONDE 3

Op basis van de lessen uit RONDE 2:

- **Eén fase per sessie indien mogelijk.** Lange sessies leiden tot vermoeidheid en vervaagde context.
- **Verifieer visueel.** "Klaar volgens Claude Code" is niet hetzelfde als "bewezen werkend".
- **Terug naar het bron-document bij twijfel.** RONDE_3_OVERZICHTSPANEEL.md is het ankerpunt.
- **Korte feedback-loops met mij.** Niet 3 fases vooruit zonder tussenchecks.
- **Drie terminals werkpatroon:** Vite dev-server, Claude Code sessie, extra commando's.

## Fase-overzicht voor RONDE 3

| Fase | Naam | Status |
|------|------|--------|
| 3A | Data-architectuur migratie | 🔜 Volgende stap |
| 3B | Bridge-laag uitbreiden | ⬜ |
| 3C | DetailPanel skelet en routing | ⬜ |
| 3D | Header en KPI-strook | ⬜ |
| 3E | Hoofdcontent en zijbalk | ⬜ |
| 3F | Cleanup en migratie afronden | ⬜ |
