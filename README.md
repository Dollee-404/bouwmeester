# Bouwmeester

Y-App extensie voor aannemers — kanban-board voor ERPNext projecten.

## Installatie in Y-App

1. Open Y-App → Settings → Extensions → Geavanceerd / Ontwikkelaar
2. Vul in:
   - **Naam:** `Bouwmeester`
   - **URL:** `https://<jouw-github-user>.github.io/bouwmeester/`
3. Sla op en open Bouwmeester via de sidebar
4. Volg de installatiewizard (eenmalig) om de benodigde ERPNext-velden aan te maken

## Lokale ontwikkeling

```bash
npm install
npm run dev    # start op http://localhost:5200
```

Zonder Y-App draait automatisch een mock-service (15 voorbeeldprojecten).
Je hebt geen ERPNext-toegang nodig voor lokale ontwikkeling.

## Bouwen en deployen

```bash
npm run build   # produceert dist/ met relatieve paden
```

Push naar `main` triggert automatisch een GitHub Pages deploy via GitHub Actions.
Extensie URL na deploy: `https://<jouw-github-user>.github.io/bouwmeester/`

## Custom fields (worden automatisch geïnstalleerd door de wizard)

| Veld | Type | Omschrijving |
|------|------|--------------|
| `custom_bouwmeester_status` | Select | Kanban status (Lead → Afgerond) |
| `custom_werksoort` | Select | Type werk (Renovatie, Nieuwbouw, etc.) |
| `custom_budget_hours` | Float | Budget in uren |
| `custom_weersafhankelijk` | Check | Weersafhankelijk ja/nee |

## Lokaal wizard testen (zonder Y-App)

| URL | Effect |
|-----|--------|
| `http://localhost:5200/?mock=wizard` | Forceert wizard met alle 4 velden als ontbrekend |
| `http://localhost:5200/?mock=noperm` | Forceert no-permission scherm (geen System Manager) |

## Documentatie

- Technisch onderzoek: `docs/research/y-app-extension-contract.md`
- Design mockups: `docs/design-references/`
- End-to-end testchecklist wizard: `docs/test-fase-2.md`

## Bewuste technische keuzes

**Vite 8.0.10** — Andere Y-App extensies (KG Planning, 3BM) gebruiken Vite 6 of 7.
Y-App zelf gebruikt Vite 7. Bouwmeester draait op Vite 8 omdat het een nieuw project is
en Vite 8 stabiel is uitgebracht. Als er deploy-problemen optreden (GitHub Pages,
iframe-laadtijd) is downgrade naar Vite 7 de eerste stap om te proberen.
