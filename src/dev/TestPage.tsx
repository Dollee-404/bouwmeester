import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, LayoutGrid, List, Hammer } from "lucide-react";
import { SituatieStrook, type SituatieStrookProps } from "../components/detail/planning/SituatieStrook";
import { WerkvoorraadStrook } from "../components/detail/planning/WerkvoorraadStrook";
import { computeWerkvoorraad } from "../components/detail/planning/werkvoorraad-logica";
import type { WerkvoorraadItem } from "../components/detail/planning/werkvoorraad-logica";
import { GanttStrook } from "../components/detail/planning/GanttStrook";
import { computeGanttData } from "../components/detail/planning/gantt-logica";
import { TaskDetailPaneel } from "../components/detail/planning/TaskDetailPaneel";
import { enrichTasksWithWachtOp } from "../data/planning-helpers";
import type { ProjectTask, TimesheetMap } from "../data/detail-types";

import { HOST_ORIGIN, INSTANCE_ID, ERPNEXT_URL, LANG } from "../bridge";
import { useProjects } from "../hooks/use-projects";
import { setMockForceFail } from "../data/projects-service-mock";
import { useMockErrors, type MockErrorFlags } from "./mock-error-context";
import { ProjectCard } from "../components/kanban/ProjectCard";
import { ProjectCardSkeleton } from "../components/kanban/ProjectCardSkeleton";
import { KanbanBoard } from "../components/kanban/KanbanBoard";
import { ProjectsPage } from "../pages/ProjectsPage";
import type { Project } from "../data/types";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Avatar } from "../components/ui/avatar";
import { Toggle } from "../components/ui/toggle";
import { EmptyState } from "../components/ui/empty-state";
import { LoadingState } from "../components/ui/loading-state";
import { useToast } from "../components/ui/toast";

const SHOWCASE_PROJECTS: Project[] = [
  {
    id: "PROJ-0001", projectName: "Renovatie Sporthal De Hoge Dijk", customerName: "Gemeente Dordrecht",
    status: "Lead", werksoort: "Renovatie", startDate: null, endDate: null,
    percentComplete: 0, budgetSales: 485_000, budgetHours: null, billedAmount: 0,
    estimatedCosting: 420_000, projectLeader: null,
    isWeatherDependent: false, isArchived: false,
  },
  {
    id: "PROJ-0009", projectName: "Renovatie Gemeentehuis Sliedrecht", customerName: "Gemeente Sliedrecht",
    status: "In uitvoering", werksoort: "Renovatie",
    startDate: new Date("2026-02-01"), endDate: new Date("2026-08-31"),
    percentComplete: 38, budgetSales: 1_150_000, budgetHours: 2300, billedAmount: 437_000,
    estimatedCosting: 1_020_000, projectLeader: "M. Janssen",
    isWeatherDependent: false, isArchived: false,
  },
  {
    id: "PROJ-0011", projectName: "Onderhoud Rioolstelsel Alblasserdam", customerName: "Gemeente Alblasserdam",
    status: "In uitvoering", werksoort: "Onderhoud",
    startDate: new Date("2026-03-15"), endDate: new Date("2026-06-30"),
    percentComplete: 71, budgetSales: 340_000, budgetHours: 680, billedAmount: 385_000,
    estimatedCosting: 305_000, projectLeader: null,
    isWeatherDependent: false, isArchived: false,
  },
  {
    id: "PROJ-0013", projectName: "Sloop en Herbouw Pakhuizen Dordrecht", customerName: "Historisch Dordrecht BV",
    status: "Oplevering", werksoort: "Sloop",
    startDate: new Date("2025-06-01"), endDate: new Date("2026-05-31"),
    percentComplete: 96, budgetSales: 2_100_000, budgetHours: 4_200, billedAmount: 2_016_000,
    estimatedCosting: 1_890_000, projectLeader: "P. Bakker",
    isWeatherDependent: true, isArchived: false,
  },
  {
    id: "PROJ-0016", projectName: "Inspectie Daken Hendrik-Ido-Ambacht", customerName: "VVE Rivierstraat",
    status: "Lead", werksoort: null, startDate: null, endDate: null,
    percentComplete: 0, budgetSales: 18_500, budgetHours: null, billedAmount: 0,
    estimatedCosting: 15_000, projectLeader: null,
    isWeatherDependent: false, isArchived: false,
  },
];

function KanbanBoardShowcase() {
  const { projects, loading } = useProjects({ includeArchived: true });
  const [narrow, setNarrow] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-sm font-semibold text-slate-700 mr-auto">KanbanBoard showcase (tijdelijk)</h2>
        <Button
          size="sm"
          variant={showArchived ? "primary" : "secondary"}
          onClick={() => setShowArchived((v) => !v)}
        >
          {showArchived ? "Verberg gearchiveerd" : "Toon gearchiveerd"}
        </Button>
        <Button
          size="sm"
          variant={narrow ? "primary" : "secondary"}
          onClick={() => setNarrow((n) => !n)}
        >
          {narrow ? "Volledig breed" : "Test smal scherm (1024px)"}
        </Button>
      </div>

      <div
        style={narrow ? { maxWidth: 1024, overflow: "hidden", border: "1.5px dashed #94a3b8", borderRadius: 8, padding: 8 } : undefined}
      >
        {narrow && (
          <p className="text-xs text-slate-400 mb-2 font-mono">Test viewport: 1024px</p>
        )}
        {loading ? (
          <p className="text-xs text-slate-400">Laden…</p>
        ) : (
          <KanbanBoard projects={projects} showArchived={showArchived} />
        )}
      </div>
    </section>
  );
}

function CardShowcase() {
  return (
    <>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-700">ProjectCard showcase (tijdelijk)</h2>
        <div className="flex gap-3 items-start flex-wrap">
          {SHOWCASE_PROJECTS.map((p) => (
            <div key={p.id} className="w-56">
              <ProjectCard project={p} />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Skeleton — voorbeeld tijdens initial load</h2>
        <div className="flex gap-3 items-start">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-56">
              <ProjectCardSkeleton />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function DatalaagResults() {
  const { projects, loading, error, refetch } = useProjects();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="secondary" onClick={refetch} loading={loading}>
          Ververs
        </Button>
        {!loading && !error && (
          <span className="text-sm text-slate-600">
            {projects.length === 0
              ? "0 projecten — leeg in ERPNext"
              : `${projects.length} projecten geladen`}
          </span>
        )}
        {loading && <span className="text-sm text-slate-400">Laden…</span>}
        {error && (
          <span className="text-sm text-red-600 font-mono">{error.message}</span>
        )}
      </div>
      {projects.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs font-mono text-slate-700">
          {projects.slice(0, 3).map((p) => (
            <li key={p.id}>
              <span className="text-slate-400">{p.id}</span>{" "}
              {p.projectName}{" "}
              <span className="text-y-teal-dark">[{p.status}]</span>{" "}
              €{p.budgetSales.toLocaleString("nl-NL")}
            </li>
          ))}
          {projects.length > 3 && (
            <li className="text-slate-400">…en {projects.length - 3} meer</li>
          )}
        </ul>
      )}
    </div>
  );
}

function DatalaagCheck() {
  const [enabled, setEnabled] = useState(false);
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-slate-700">Datalaag check (tijdelijk)</h2>
      <Card variant="info" className="p-4">
        {!enabled
          ? <Button size="sm" variant="secondary" onClick={() => setEnabled(true)}>Laad projecten</Button>
          : <DatalaagResults />
        }
      </Card>
    </section>
  );
}

const ERROR_TOGGLES: {
  key: keyof MockErrorFlags;
  label: string;
  description: string;
}[] = [
  {
    key: "bridgeTimeout",
    label: "Simuleer bridge-timeout",
    description:
      'Promise rejecteert na 12 seconden met Error("Bridge timeout"). Geldt voor alle bridge-calls.',
  },
  {
    key: "erpNext500",
    label: "Simuleer ERPNext 500-fout",
    description:
      'Gooit onmiddellijk Error("ERPNext error: 500 Internal Server Error"). Geldt voor alle service-methodes.',
  },
  {
    key: "fetchError",
    label: "Simuleer fetch-fout bij projects",
    description:
      'list() throws Error("Kan projecten niet ophalen"). Andere methodes (updateStatus etc.) werken normaal.',
  },
  {
    key: "emptyDatabase",
    label: "Simuleer lege database",
    description:
      "list() retourneert []. Test de 'Nog geen projecten' empty state in ProjectsPage.",
  },
];

function ErrorSimSection() {
  const { flags, setFlag } = useMockErrors();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-700">
        Error-state simulatie
      </h2>
      <Card variant="info" className="p-4 flex flex-col gap-3">
        {ERROR_TOGGLES.map(({ key, label, description }) => (
          <label
            key={key}
            className="flex items-start gap-2.5 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              className="mt-0.5 shrink-0"
              checked={flags[key]}
              onChange={(e) => setFlag(key, e.target.checked)}
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-slate-700">{label}</span>
              <span className="text-xs text-slate-500">{description}</span>
            </span>
          </label>
        ))}
      </Card>
    </section>
  );
}

export function TestPage() {
  const { t, i18n } = useTranslation();
  const { addToast } = useToast();
  const { flags } = useMockErrors();
  const [view, setView] = useState<"Board" | "Tabel">("Board");
  const [loading, setLoading] = useState(false);

  // Zorgt dat ProjectsPage opnieuw laadt als een error-flag wijzigt
  const errorKey = `${flags.bridgeTimeout}-${flags.erpNext500}-${flags.fetchError}-${flags.emptyDatabase}`;

  function triggerLoading() {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  }

  return (
  <>
    <div className="p-8 max-w-3xl mx-auto flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-y-teal-dark">
        Bouwmeester — Dev testpagina (?dev=1)
      </h1>

      {/* Bridge debug overlay */}
      <Card variant="info" className="p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
          Bridge URL-params
        </p>
        <div className="font-mono text-xs text-slate-700 flex flex-col gap-1">
          <span><strong>HOST_ORIGIN:</strong> {HOST_ORIGIN}</span>
          <span><strong>INSTANCE_ID:</strong> {INSTANCE_ID || "(leeg — mock mode)"}</span>
          <span><strong>ERPNEXT_URL:</strong> {ERPNEXT_URL || "(leeg)"}</span>
          <span><strong>LANG:</strong> {LANG}</span>
        </div>
      </Card>

      {/* i18n */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-700">i18n ({i18n.language})</h2>
        <div className="flex gap-2">
          <Button size="sm" variant={i18n.language === "nl" ? "primary" : "secondary"} onClick={() => i18n.changeLanguage("nl")}>NL</Button>
          <Button size="sm" variant={i18n.language === "en" ? "primary" : "secondary"} onClick={() => i18n.changeLanguage("en")}>EN</Button>
        </div>
        <p className="text-sm text-slate-600">
          projects.title: <strong>{t("projects.title")}</strong> &middot;
          common.loading: <strong>{t("common.loading")}</strong> &middot;
          status.lead: <strong>{t("status.lead")}</strong>
        </p>
      </section>

      {/* Buttons */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Button</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="primary" size="sm">Small</Button>
        </div>
      </section>

      {/* Badges */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Badge</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="purple">Purple</Badge>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="success" size="xs">XS</Badge>
        </div>
      </section>

      {/* Input + Select */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Input + Select</h2>
        <div className="flex gap-3 flex-wrap">
          <Input icon={<Search size={14} />} placeholder="Zoek project..." className="w-56" />
          <Input placeholder="Zonder icoon" className="w-48" />
          <Select
            options={[
              { value: "", label: "Alle werksoorten" },
              { value: "renovatie", label: "Renovatie" },
              { value: "nieuwbouw", label: "Nieuwbouw" },
            ]}
          />
        </div>
      </section>

      {/* Avatar */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Avatar</h2>
        <div className="flex gap-2 items-center">
          <Avatar name="Jan de Vries" size="xs" />
          <Avatar name="Mieke Janssen" size="sm" />
          <Avatar name="Peter Bakker" size="md" />
          <Avatar name="Drechtstedenbouw" size="md" />
          <Avatar name="X" size="md" />
        </div>
      </section>

      {/* Toggle */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Toggle</h2>
        <Toggle
          options={["Board", "Tabel"]}
          value={view}
          onChange={(v) => setView(v as "Board" | "Tabel")}
          icons={[<LayoutGrid size={13} key="b" />, <List size={13} key="t" />]}
        />
        <p className="text-xs text-slate-500">Actief: {view}</p>
      </section>

      {/* Cards */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Card</h2>
        <div className="flex gap-3">
          <Card variant="container" className="p-4 flex-1">
            <p className="text-sm">Container card (white + shadow)</p>
          </Card>
          <Card variant="info" className="p-4 flex-1">
            <p className="text-sm">Info card (slate-50)</p>
          </Card>
        </div>
      </section>

      {/* EmptyState */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-700">EmptyState</h2>
        <EmptyState
          icon={<Hammer size={32} />}
          title="Geen projecten gevonden"
          description="Voeg een nieuw project toe om te beginnen"
          action={<Button variant="primary" size="sm">Nieuw project</Button>}
        />
        <EmptyState title="Compact (in kolom)" compact />
      </section>

      {/* LoadingState */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-700">LoadingState</h2>
        {loading ? (
          <LoadingState message="Projecten ophalen..." />
        ) : (
          <Button variant="secondary" size="sm" onClick={triggerLoading}>
            Trigger loading (2s)
          </Button>
        )}
      </section>

      <DatalaagCheck />
      <CardShowcase />

      {/* Toast */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Toast</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => addToast("Opgeslagen!", "success")}>
            Success toast
          </Button>
          <Button size="sm" variant="secondary" onClick={() => addToast("Er ging iets mis", "error")}>
            Error toast
          </Button>
          <Button size="sm" variant="secondary" onClick={() => addToast("Even geduld...", "info")}>
            Info toast
          </Button>
        </div>
      </section>
    </div>

    {/* KanbanBoard showcase */}
    <div className="px-8 pb-8">
      <KanbanBoardShowcase />
    </div>

    {/* Error-state simulatie */}
    <div className="px-8 py-4 max-w-3xl">
      <ErrorSimSection />
    </div>

    {/* ProjectsPage — met debug-toggle */}
    <div className="border-t-2 border-dashed border-slate-200 mt-4">
      <div className="px-8 py-3 flex items-center gap-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mr-auto">
          ProjectsPage preview
        </h2>
        <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer select-none">
          <input
            type="checkbox"
            onChange={(e) => setMockForceFail(e.target.checked)}
          />
          Forceer fout bij updateStatus (test rollback)
        </label>
      </div>
      <ProjectsPage key={errorKey} />
    </div>

    {/* ── Situatiestrook showcase (4B) ──────────────────────────────────── */}
    <SituatieStrookShowcase />

    {/* ── Werkvoorraad showcase (4C) ───────────────────────────────────── */}
    <WerkvoorraadStrookShowcase />

    {/* ── Werkvoorraad logica-test (4C) ────────────────────────────────── */}
    <WerkvoorraadLogicaTest />

    {/* ── Gantt showcase (4D) ──────────────────────────────────────────── */}
    <GanttStrookShowcase />

    {/* ── Gantt logica-test (4D) ───────────────────────────────────────── */}
    <GanttLogicaTest />

    {/* ── Gantt palet-keuze (4D) ───────────────────────────────────────── */}
    <GanttPaletteShowcase />

    {/* ── TaskDetailPaneel showcase (4E) ───────────────────────────────── */}
    <TaskDetailPaneelShowcase />

    {/* ── Wacht-op showcase (4F) ───────────────────────────────────────── */}
    <WachtOpShowcase />

    {/* ── Kleurpalet per werksoort (5E) ────────────────────────────────── */}
    <PalettenShowcase5E />
  </>
  );
}

// ── Vaste datum voor reproducteerbare screenshots ─────────────────────────────
const DEMO_TODAY   = new Date("2026-05-11");
const DEMO_START   = new Date("2026-02-01");
const DEMO_END     = new Date("2026-08-31");
const DEMO_MIJLPAAL: SituatieStrookProps["mijlpalen"] = [
  { date: new Date("2026-06-15"), subject: "oplevering ruwbouw" },
  { date: new Date("2026-08-10"), subject: "sleuteloverdracht" },
];

const DEMO_CASES: Array<{ label: string; props: SituatieStrookProps }> = [
  {
    label: "Op schema (groen)",
    props: {
      status: "op-schema",
      achterstandDagen: 0,
      volgendeMijlpaal: { subject: "oplevering ruwbouw", overDagen: 23 },
      isWeatherDependent: false,
      projectStart: DEMO_START,
      projectEnd: DEMO_END,
      today: DEMO_TODAY,
      mijlpalen: DEMO_MIJLPAAL,
    },
  },
  {
    label: "Licht achter — 1-5 dagen (oranje)",
    props: {
      status: "licht-achter",
      achterstandDagen: 3,
      volgendeMijlpaal: { subject: "oplevering ruwbouw", overDagen: 23 },
      isWeatherDependent: false,
      projectStart: DEMO_START,
      projectEnd: DEMO_END,
      today: DEMO_TODAY,
      mijlpalen: DEMO_MIJLPAAL,
    },
  },
  {
    label: "Fors achter — >5 dagen (rood)",
    props: {
      status: "fors-achter",
      achterstandDagen: 8,
      volgendeMijlpaal: { subject: "oplevering ruwbouw", overDagen: 8 },
      isWeatherDependent: true,
      projectStart: DEMO_START,
      projectEnd: DEMO_END,
      today: DEMO_TODAY,
      mijlpalen: DEMO_MIJLPAAL,
    },
  },
  {
    label: "Oplevering overschreden (rood — andere toon)",
    props: {
      status: "overschreden",
      achterstandDagen: 12,
      volgendeMijlpaal: null,
      isWeatherDependent: false,
      projectStart: new Date("2025-09-01"),
      projectEnd: new Date("2026-04-15"),
      today: DEMO_TODAY,
      mijlpalen: [{ date: new Date("2026-04-15"), subject: "oplevering" }],
    },
  },
];

// ── Schaal-test: drie projectduren ───────────────────────────────────────────
const SCALE_CASES: Array<{ label: string; props: SituatieStrookProps }> = [
  {
    label: "3 weken (vandaag ≈ 67% — nabij einde)",
    props: {
      status: "licht-achter", achterstandDagen: 2,
      volgendeMijlpaal: { subject: "oplevering", overDagen: 5 },
      isWeatherDependent: false,
      projectStart: new Date("2026-04-27"),
      projectEnd:   new Date("2026-05-18"),
      today: DEMO_TODAY,
      mijlpalen: [{ date: new Date("2026-05-16"), subject: "oplevering" }],
    },
  },
  {
    label: "7 maanden (huidige testcase — vandaag ≈ 47%)",
    props: {
      status: "licht-achter", achterstandDagen: 3,
      volgendeMijlpaal: { subject: "oplevering ruwbouw", overDagen: 23 },
      isWeatherDependent: false,
      projectStart: DEMO_START,
      projectEnd:   DEMO_END,
      today: DEMO_TODAY,
      mijlpalen: DEMO_MIJLPAAL,
    },
  },
  {
    label: "2 jaar (vandaag ≈ 68% — mijlpalen verspreid)",
    props: {
      status: "op-schema", achterstandDagen: 0,
      volgendeMijlpaal: { subject: "casco gereed", overDagen: 42 },
      isWeatherDependent: false,
      projectStart: new Date("2025-01-01"),
      projectEnd:   new Date("2026-12-31"),
      today: DEMO_TODAY,
      mijlpalen: [
        { date: new Date("2025-06-01"), subject: "fundering gereed" },
        { date: new Date("2025-12-01"), subject: "ruwbouw gereed" },
        { date: new Date("2026-06-30"), subject: "casco gereed" },
        { date: new Date("2026-12-15"), subject: "oplevering" },
      ],
    },
  },
];

// ── Edge cases ────────────────────────────────────────────────────────────────
const EDGE_CASES: Array<{ label: string; props: SituatieStrookProps }> = [
  {
    label: "Lange mijlpaal-naam",
    props: {
      status: "licht-achter", achterstandDagen: 3,
      volgendeMijlpaal: { subject: "oplevering ruwbouw constructiedeel B", overDagen: 23 },
      isWeatherDependent: false,
      projectStart: DEMO_START, projectEnd: DEMO_END, today: DEMO_TODAY,
      mijlpalen: [{ date: new Date("2026-06-15"), subject: "oplevering ruwbouw constructiedeel B" }],
    },
  },
  {
    label: "Geen mijlpalen geconfigureerd — alleen oplevering",
    props: {
      status: "licht-achter", achterstandDagen: 3,
      volgendeMijlpaal: null,
      isWeatherDependent: false,
      projectStart: DEMO_START, projectEnd: DEMO_END, today: DEMO_TODAY,
      mijlpalen: [],
    },
  },
  {
    label: "Geen mijlpalen, op schema",
    props: {
      status: "op-schema", achterstandDagen: 0,
      volgendeMijlpaal: null,
      isWeatherDependent: false,
      projectStart: DEMO_START, projectEnd: DEMO_END, today: DEMO_TODAY,
      mijlpalen: [],
    },
  },
];

function SituatieStrookShowcase() {
  return (
    <div className="mt-12 border-t border-slate-200 pt-8">
      <h2 className="text-lg font-bold text-slate-700 mb-1 px-8">
        Situatiestrook — 4B showcase (alle vier staten)
      </h2>
      <p className="text-xs text-slate-400 px-8 mb-6">
        Vaste datum: {DEMO_TODAY.toLocaleDateString("nl-NL")}
      </p>

      {/* Vier hoofdstaten */}
      <div className="px-8 flex flex-col gap-6 mb-10">
        {DEMO_CASES.map(({ label, props }) => (
          <div key={label}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <SituatieStrook {...props} />
            </div>
          </div>
        ))}
      </div>

      {/* Schaal-test */}
      <h3 className="text-sm font-semibold text-slate-500 mb-1 px-8">Schaal-test mini-tijdsstrook</h3>
      <p className="text-xs text-slate-400 px-8 mb-4">3 weken / 7 maanden / 2 jaar — labels mogen niet overlappen</p>
      <div className="px-8 flex flex-col gap-6 mb-12">
        {SCALE_CASES.map(({ label, props }) => (
          <div key={label}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <SituatieStrook {...props} />
            </div>
          </div>
        ))}
      </div>

      {/* Edge cases */}
      <h3 className="text-sm font-semibold text-slate-500 mb-1 px-8">Edge cases</h3>
      <p className="text-xs text-slate-400 px-8 mb-4">Lange naam / geen mijlpalen</p>
      <div className="px-8 flex flex-col gap-6 mb-12">
        {EDGE_CASES.map(({ label, props }) => (
          <div key={label}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <SituatieStrook {...props} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Werkvoorraad dummy-data (alle tag-types) ──────────────────────────────────

const WERKVOORRAAD_DUMMY: WerkvoorraadItem[] = [
  {
    id: "TASK-001",
    subject: "Sloopwerkzaamheden garage",
    assignedTo: "j.de.vries@bouw.nl",
    heeftDiscrepantie: false,
    reden: { type: "achterstallig" },
  },
  {
    id: "TASK-002",
    subject: "Fundering gieten — fase 2",
    assignedTo: "m.janssen@bouw.nl",
    heeftDiscrepantie: true,
    reden: { type: "start-vandaag" },
  },
  {
    id: "TASK-003",
    subject: "Isolatiewerk buitenmuur",
    assignedTo: "p.bakker@bouw.nl",
    heeftDiscrepantie: false,
    reden: { type: "vrijgekomen" },
  },
  {
    id: "TASK-004",
    subject: "Installatie dakgoten",
    assignedTo: null,
    heeftDiscrepantie: false,
    reden: { type: "start-morgen" },
  },
  {
    id: "TASK-005",
    subject: "Tegelwerk badkamer verdieping",
    assignedTo: "a.visser@bouw.nl",
    heeftDiscrepantie: false,
    reden: { type: "start-dag", dag: "donderdag" },
  },
  {
    id: "TASK-006",
    subject: "Schilderwerk trapportaal",
    assignedTo: "m.janssen@bouw.nl",
    heeftDiscrepantie: true,
    reden: { type: "klaar-voor", dag: "vrijdag" },
  },
  {
    id: "TASK-007",
    subject: "Oplevering ruwbouw",
    assignedTo: "p.bakker@bouw.nl",
    heeftDiscrepantie: false,
    reden: { type: "mijlpaal", overDagen: 8 },
  },
  {
    id: "TASK-008",
    subject: "Parketvloer leggen woonkamer",
    assignedTo: "j.de.vries@bouw.nl",
    heeftDiscrepantie: false,
    reden: { type: "wacht-op", label: "wacht op materiaal" },
  },
  {
    id: "TASK-009",
    subject: "Gevelisolatie buitengevels",
    assignedTo: null,
    heeftDiscrepantie: false,
    reden: { type: "wacht-op", label: "wacht op weer" },
  },
  {
    id: "TASK-010",
    subject: "Stucwerk wanden slaapkamers",
    assignedTo: "a.visser@bouw.nl",
    heeftDiscrepantie: false,
    reden: { type: "wacht-op", label: "wacht op voorgaande taak" },
  },
  {
    id: "TASK-011",
    subject: "Dakkapel plaatsen — voorzijde",
    assignedTo: "k.smit@bouw.nl",
    heeftDiscrepantie: false,
    reden: { type: "wacht-op", label: "wacht op vergunning" },
  },
  {
    id: "TASK-012",
    subject: "Elektra ruw — verdieping",
    assignedTo: null,
    heeftDiscrepantie: false,
    reden: { type: "wacht-op", label: "wacht op onderaannemer" },
  },
];

function WerkvoorraadStrookShowcase() {
  return (
    <div className="mt-12 border-t border-slate-200 pt-8">
      <h2 className="text-lg font-bold text-slate-700 mb-1 px-8">
        Werkvoorraad-strook — 4C showcase (alle tag-types)
      </h2>
      <p className="text-xs text-slate-400 px-8 mb-6">
        12 dummy-items — eerste 7 zichtbaar, "+5 meer" klapbaar. Klikbaar maar nog geen actie (4E).
      </p>
      <div className="px-8 pb-12 max-w-2xl">
        <WerkvoorraadStrook items={WERKVOORRAAD_DUMMY} />
      </div>

      <h3 className="text-sm font-semibold text-slate-500 mb-1 px-8">Edge case — leeg</h3>
      <p className="text-xs text-slate-400 px-8 mb-4">Geen aandachtspunten deze week</p>
      <div className="px-8 pb-12 max-w-2xl">
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <WerkvoorraadStrook items={[]} />
        </div>
      </div>
    </div>
  );
}

// ── Synthetische testcase: selectie-logica + assign-parsing + discrepantie ────
// "today" = 2026-05-11 (maandag), week = 2026-05-11 t/m 2026-05-17

const SYNTH_TODAY = new Date("2026-05-11");

const SYNTH_TASKS: ProjectTask[] = [
  // Criterium 3: achterstallig — einddatum 5 mei (verleden), discrepantie (9u/10u, 40%)
  { id: "S1", subject: "Sloopwerk [achterstallig + discrepantie]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 40,
    expectedStartDate: new Date("2026-04-28"), expectedEndDate: new Date("2026-05-05"),
    budgetHours: 10, dependsOn: [], assignedTo: ["jan.de.vries@test.nl"],
    wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },

  // Criterium 1: start vandaag (maandag 11 mei)
  { id: "S2", subject: "Fundering gieten [start vandaag]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-11"), expectedEndDate: new Date("2026-05-20"),
    budgetHours: 8, dependsOn: [], assignedTo: ["m.janssen@test.nl"],
    wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },

  // Criterium 2: einddatum vrijdag 15 mei (deze week), discrepantie (13.5u/16u, 60%)
  { id: "S3", subject: "Stucwerk [klaar vóór vrijdag + discrepantie]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 60,
    expectedStartDate: new Date("2026-05-04"), expectedEndDate: new Date("2026-05-15"),
    budgetHours: 16, dependsOn: [], assignedTo: [],
    wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },

  // Criterium 4: kan starten — S5 (dep) is Completed, start 11 mei ≤ weekEnd 17 mei
  { id: "S4", subject: "Isolatiewerk [kan starten — dep S5 is klaar]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-11"), expectedEndDate: new Date("2026-05-22"),
    budgetHours: 12, dependsOn: ["S5"], assignedTo: ["p.bakker@test.nl"],
    wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },

  // Afgeronde dep voor S4 — zelf NIET in werkvoorraad
  { id: "S5", subject: "Fundering [Completed — dep van S4, NIET in lijst]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Completed", progress: 100,
    expectedStartDate: new Date("2026-04-20"), expectedEndDate: new Date("2026-05-08"),
    budgetHours: 20, dependsOn: [], assignedTo: [],
    wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },

  // Criterium 5: mijlpaal zondag 17 mei (6 dagen)
  { id: "S6", subject: "Oplevering ruwbouw [mijlpaal over 6d]",
    parentTask: null, isMilestone: true, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: null, expectedEndDate: new Date("2026-05-17"),
    budgetHours: null, dependsOn: [], assignedTo: ["j.smit@test.nl"],
    wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },

  // UITGESLOTEN: toekomstige start buiten week, geen deps, geen mijlpaal
  { id: "S7", subject: "Toekomstig werk [GEEN kwalificatie — start 1 jun]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-06-01"), expectedEndDate: new Date("2026-06-30"),
    budgetHours: null, dependsOn: [], assignedTo: [],
    wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },

  // UITGESLOTEN: isGroup = true
  { id: "S8", subject: "Fase A [GEEN kwalificatie — groeptaak]",
    parentTask: null, isMilestone: false, isGroup: true, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-11"), expectedEndDate: new Date("2026-05-30"),
    budgetHours: null, dependsOn: [], assignedTo: [],
    wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },

  // Extra taken → 12 kwalificerende items zodat "+5 meer" aantoonbaar werkt op echte logica
  { id: "S9", subject: "Dakgoten installeren [start morgen]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-12"), expectedEndDate: new Date("2026-05-19"),
    budgetHours: null, dependsOn: [], assignedTo: ["a.visser@test.nl"],
    wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
  { id: "S10", subject: "Tegelwerk badkamer [start woensdag]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-13"), expectedEndDate: new Date("2026-05-22"),
    budgetHours: null, dependsOn: [], assignedTo: [],
    wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
  { id: "S11", subject: "Schilderwerk trapportaal [start donderdag]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-14"), expectedEndDate: new Date("2026-05-21"),
    budgetHours: null, dependsOn: [], assignedTo: ["m.janssen@test.nl"],
    wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
  { id: "S12", subject: "Parketvloer leggen [klaar vóór woensdag]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 50,
    expectedStartDate: new Date("2026-05-04"), expectedEndDate: new Date("2026-05-13"),
    budgetHours: null, dependsOn: [], assignedTo: ["jan.de.vries@test.nl"],
    wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
  { id: "S13", subject: "Elektrische installatie [klaar vóór donderdag]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 30,
    expectedStartDate: new Date("2026-05-06"), expectedEndDate: new Date("2026-05-14"),
    budgetHours: null, dependsOn: [], assignedTo: [],
    wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
  { id: "S14", subject: "Vloerverwarming leggen [kan starten — dep S15 klaar]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-13"), expectedEndDate: new Date("2026-05-20"),
    budgetHours: null, dependsOn: ["S15"], assignedTo: ["p.bakker@test.nl"],
    wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
  // Completed dep voor S14 — NIET in werkvoorraad
  { id: "S15", subject: "Betonvloer [Completed — dep van S14, NIET in lijst]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Completed", progress: 100,
    expectedStartDate: new Date("2026-04-25"), expectedEndDate: new Date("2026-05-09"),
    budgetHours: null, dependsOn: [], assignedTo: [],
    wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
  { id: "S16", subject: "Sleuteloverdracht [mijlpaal volgende week]",
    parentTask: null, isMilestone: true, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: null, expectedEndDate: new Date("2026-05-21"),
    budgetHours: null, dependsOn: [], assignedTo: [],
    wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
];

const SYNTH_TIMESHEETS: TimesheetMap = {
  "S1": 9.0,   // 90% van 10u budget, voortgang 40% → discrepantie ✓
  "S3": 13.5,  // 84% van 16u budget, voortgang 60% → discrepantie ✓
};

// Berekend op module-niveau (puur, geen side-effects)
const SYNTH_RESULT = computeWerkvoorraad(SYNTH_TASKS, SYNTH_TIMESHEETS, SYNTH_TODAY);
const SYNTH_MATCHED_IDS = new Set(SYNTH_RESULT.map((i) => i.id));
const SYNTH_EXCLUDED = SYNTH_TASKS.filter((t) => !SYNTH_MATCHED_IDS.has(t.id));

function WerkvoorraadLogicaTest() {
  return (
    <div className="mt-8 border-t border-slate-200 pt-8">
      <h2 className="text-lg font-bold text-slate-700 mb-1 px-8">
        Werkvoorraad-logica — synthetische test
      </h2>
      <p className="text-xs text-slate-400 px-8 mb-1">
        "Vandaag" = 2026-05-11 (maandag). Week = 2026-05-11 t/m 2026-05-17.
        Toont criteria 1-5, assign-parsing (email→initialen) en discrepantie-indicator.
      </p>
      <p className="text-xs text-slate-400 px-8 mb-6">
        Verwachte volgorde: <span className="font-mono">S1 achterstallig → S2 start vandaag → S4 kan starten → S3 klaar vóór vrijdag → S6 mijlpaal</span>
      </p>

      <div className="px-8 pb-8 max-w-2xl">
        <WerkvoorraadStrook items={SYNTH_RESULT} />
      </div>

      <h3 className="text-sm font-semibold text-slate-500 mb-2 px-8">
        Terecht uitgesloten ({SYNTH_EXCLUDED.length} taken)
      </h3>
      <ul className="px-8 pb-12 flex flex-col gap-1 text-xs font-mono text-slate-500 max-w-2xl">
        {SYNTH_EXCLUDED.map((t) => (
          <li key={t.id} className="flex gap-2">
            <span className="text-slate-400">{t.id}</span>
            <span className="text-slate-600 truncate">{t.subject}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Gantt: dummy-data voor showcase ───────────────────────────────────────────

const GANTT_TODAY = new Date("2026-05-11");

function GanttStrookShowcase() {
  const [panel, setPanel] = useState<{ id: string; mode: "task" | "phase" } | null>(null);
  const ganttData = computeGanttData(PANEL_DEMO_TASKS);

  return (
    <div className="mt-12 border-t border-slate-200 pt-8">
      <h2 className="text-lg font-bold text-slate-700 mb-1 px-8">
        Gantt-strook — 4D showcase (dummy-fases)
      </h2>
      <p className="text-xs text-slate-400 px-8 mb-6">
        5 fases, 2 mijlpalen. "Vandaag" = 2026-05-11.
        Amber balk + onderlijn = kritiek pad. Drie zoomknoppen: Week / Maand / Heel project.
        Klik op een fase-balk → opent Fase-modus paneel.
      </p>
      <div className="px-8 pb-12 max-w-4xl">
        <GanttStrook
          data={ganttData}
          today={GANTT_TODAY}
          onFaseClick={(id) => setPanel({ id, mode: "phase" })}
        />
      </div>

      <h3 className="text-sm font-semibold text-slate-500 mb-1 px-8">Edge case — leeg</h3>
      <p className="text-xs text-slate-400 px-8 mb-4">Geen fases met planningsdatums</p>
      <div className="px-8 pb-12 max-w-4xl">
        <GanttStrook
          data={{ fases: [], mijlpalen: [], projectStart: null, projectEnd: null }}
          today={GANTT_TODAY}
        />
      </div>

      {panel && (
        <TaskDetailPaneel
          key={panel.id}
          tasks={PANEL_DEMO_TASKS}
          timesheets={PANEL_DEMO_TIMESHEETS}
          initialId={panel.id}
          initialMode={panel.mode}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
}

// ── Gantt: synthetische logica-test ───────────────────────────────────────────

const GANTT_SYNTH_TASKS: ProjectTask[] = [
  // Fase 1: Fundering (alle children afgerond → progress=100%)
  { id: "GF1", subject: "Fundering & Grondwerk",
    parentTask: null, isMilestone: false, isGroup: true, status: "Open", progress: 80,
    expectedStartDate: null, expectedEndDate: null,
    budgetHours: null, dependsOn: [], assignedTo: [], wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
  { id: "GC1", subject: "Grondwerk & sleuven graven",
    parentTask: "GF1", isMilestone: false, isGroup: false, status: "Completed", progress: 100,
    expectedStartDate: new Date("2026-02-02"), expectedEndDate: new Date("2026-03-06"),
    budgetHours: 40, dependsOn: [], assignedTo: ["j.de.vries@bouw.nl"], wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
  { id: "GC2", subject: "Fundering storten",
    parentTask: "GF1", isMilestone: false, isGroup: false, status: "Completed", progress: 100,
    expectedStartDate: new Date("2026-03-02"), expectedEndDate: new Date("2026-03-20"),
    budgetHours: 30, dependsOn: ["GC1"], assignedTo: [], wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },

  // Fase 2: Ruwbouw (gedeeltelijk)
  { id: "GF2", subject: "Ruwbouw & Constructie",
    parentTask: null, isMilestone: false, isGroup: true, status: "Open", progress: 40,
    expectedStartDate: new Date("2026-03-16"), expectedEndDate: new Date("2026-06-19"),
    budgetHours: null, dependsOn: [], assignedTo: [], wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
  { id: "GC3", subject: "Muren metselen — begane grond",
    parentTask: "GF2", isMilestone: false, isGroup: false, status: "Open", progress: 100,
    expectedStartDate: new Date("2026-03-16"), expectedEndDate: new Date("2026-04-17"),
    budgetHours: 80, dependsOn: ["GC2"], assignedTo: ["m.janssen@bouw.nl"], wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
  { id: "GC4", subject: "Vloeren storten — verdieping",
    parentTask: "GF2", isMilestone: false, isGroup: false, status: "Open", progress: 25,
    expectedStartDate: new Date("2026-04-13"), expectedEndDate: new Date("2026-06-19"),
    budgetHours: 100, dependsOn: ["GC3"], assignedTo: ["m.janssen@bouw.nl"], wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },

  // Fase 3: Installaties (nog niet begonnen, datums van children)
  { id: "GF3", subject: "Installaties",
    parentTask: null, isMilestone: false, isGroup: true, status: "Open", progress: 0,
    expectedStartDate: null, expectedEndDate: null,
    budgetHours: null, dependsOn: [], assignedTo: [], wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
  { id: "GC5", subject: "Elektra & sanitair ruw",
    parentTask: "GF3", isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-06-01"), expectedEndDate: new Date("2026-08-07"),
    budgetHours: 60, dependsOn: ["GC4"], assignedTo: [], wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },

  // Fase 4: Afwerking (GC6=kritiek, GC7=niet-kritiek parallel)
  { id: "GF4", subject: "Afwerking",
    parentTask: null, isMilestone: false, isGroup: true, status: "Open", progress: 0,
    expectedStartDate: null, expectedEndDate: null,
    budgetHours: null, dependsOn: [], assignedTo: [], wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
  { id: "GC6", subject: "Stukadoor & schilderwerk",
    parentTask: "GF4", isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-07-20"), expectedEndDate: new Date("2026-09-11"),
    budgetHours: 80, dependsOn: ["GC5"], assignedTo: [], wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
  { id: "GC7", subject: "Tegelwerk badkamer",
    parentTask: "GF4", isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-08-03"), expectedEndDate: new Date("2026-08-28"),
    budgetHours: 20, dependsOn: ["GC5"], assignedTo: [], wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },

  // Fase 5: Buitenterrein (parallel, NIET kritiek)
  { id: "GF5", subject: "Buitenterrein",
    parentTask: null, isMilestone: false, isGroup: true, status: "Open", progress: 0,
    expectedStartDate: null, expectedEndDate: null,
    budgetHours: null, dependsOn: [], assignedTo: [], wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
  { id: "GC8", subject: "Terreininrichting & bestrating",
    parentTask: "GF5", isMilestone: false, isGroup: false, status: "Open", progress: 15,
    expectedStartDate: new Date("2026-04-06"), expectedEndDate: new Date("2026-06-12"),
    budgetHours: 30, dependsOn: [], assignedTo: [], wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },

  // Mijlpalen
  { id: "GM1", subject: "Oplevering ruwbouw",
    parentTask: null, isMilestone: true, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: null, expectedEndDate: new Date("2026-06-19"),
    budgetHours: null, dependsOn: [], assignedTo: [], wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
  { id: "GM2", subject: "Sleuteloverdracht",
    parentTask: null, isMilestone: true, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: null, expectedEndDate: new Date("2026-09-11"),
    budgetHours: null, dependsOn: [], assignedTo: [], wachtOp: null, wachtOpToelichting: null, actualStartDate: null, actualEndDate: null, description: null },
];

const GANTT_SYNTH_RESULT = computeGanttData(GANTT_SYNTH_TASKS);

function GanttLogicaTest() {
  const { fases, mijlpalen } = GANTT_SYNTH_RESULT;

  return (
    <div className="mt-8 border-t border-slate-200 pt-8">
      <h2 className="text-lg font-bold text-slate-700 mb-1 px-8">
        Gantt-logica — synthetische test
      </h2>
      <p className="text-xs text-slate-400 px-8 mb-1">
        5 fases, 8 leaftaken + 2 mijlpalen. GF1/GF3/GF4/GF5 datums afgeleid van children.
        Kritiek pad: GC1→GC2→GC3→GC4→GC5→GC6. GC7 en GC8 zijn NIET kritiek.
      </p>
      <p className="text-xs text-slate-400 px-8 mb-6">
        Verwacht: GF1(100%, krit.), GF2(63%, krit.), GF3(0%, krit.), GF4(0%, krit.), GF5(15%, <strong>niet krit.</strong>)
      </p>

      <div className="px-8 pb-6 max-w-4xl">
        <GanttStrook data={GANTT_SYNTH_RESULT} today={GANTT_TODAY} />
      </div>

      <table className="mx-8 mb-8 text-xs font-mono border-collapse">
        <thead>
          <tr className="text-slate-400">
            <th className="text-left pr-4 pb-1">ID</th>
            <th className="text-left pr-4 pb-1">Fase</th>
            <th className="text-right pr-4 pb-1">Start</th>
            <th className="text-right pr-4 pb-1">Einde</th>
            <th className="text-right pr-4 pb-1">Voortg.</th>
            <th className="text-left pb-1">Kritiek</th>
          </tr>
        </thead>
        <tbody>
          {fases.map(f => (
            <tr key={f.id} className="text-slate-600">
              <td className="pr-4 py-0.5 text-slate-400">{f.id}</td>
              <td className="pr-4 py-0.5">{f.subject}</td>
              <td className="pr-4 py-0.5 text-right">{f.plannedStart?.toLocaleDateString("nl-NL") ?? "—"}</td>
              <td className="pr-4 py-0.5 text-right">{f.plannedEnd?.toLocaleDateString("nl-NL") ?? "—"}</td>
              <td className="pr-4 py-0.5 text-right">{f.progress}%</td>
              <td className={`py-0.5 font-semibold ${f.isCritical ? "text-amber-600" : "text-slate-400"}`}>
                {f.isCritical ? "ja" : "nee"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="text-sm font-semibold text-slate-500 mb-2 px-8">
        Mijlpalen ({mijlpalen.length})
      </h3>
      <ul className="px-8 pb-12 flex flex-col gap-1 text-xs font-mono text-slate-500">
        {mijlpalen.map(m => (
          <li key={m.id} className="flex gap-3">
            <span className="text-slate-400">{m.id}</span>
            <span>{m.subject}</span>
            <span className="text-amber-600">{m.date.toLocaleDateString("nl-NL")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Gantt palet-keuze showcase ────────────────────────────────────────────────
// Toont 3 paletten × 2 baseline-strategieën = 6 mini-Gantt-varianten.
// Vaste "Heel project"-posities (feb–sep 2026), geen zoomknoppen nodig.

type MiniFaseKleur = { deep: string; light: string };

type MiniFase = {
  id: string;
  label: string;
  start: number;  // % van viewStart
  end: number;
  progress: number;
  critical: boolean;
  aarde: MiniFaseKleur;
  koel: MiniFaseKleur;
  harmonie: MiniFaseKleur;
};

// feb 2 – sep 11 = 221 dagen; 11 mei = dag 98 → 44.3%
const MINI_VANDAAG_PCT = 44.3;
const MINI_MIJLPALEN_PCT = [62, 100]; // oplevering ruwbouw (19 jun), sleuteloverdracht (11 sep)

const MINI_FASES: MiniFase[] = [
  {
    id: "GF1", label: "Fundering", start: 0, end: 20.8, progress: 100, critical: true,
    aarde:    { deep: "#6b8f68", light: "#c4d6c2" }, // sage groen
    koel:     { deep: "#4d8c8a", light: "#aed4d2" }, // gedempt teal
    harmonie: { deep: "#6b8f68", light: "#c4d6c2" }, // sage
  },
  {
    id: "GF2", label: "Ruwbouw", start: 19, end: 62, progress: 63, critical: true,
    aarde:    { deep: "#8c6d3f", light: "#d6c0a2" }, // gedempt brons
    koel:     { deep: "#5060a0", light: "#b2bad8" }, // indigo
    harmonie: { deep: "#a07080", light: "#d8bec6" }, // dusty rose
  },
  {
    id: "GF3", label: "Installaties", start: 53.8, end: 84.2, progress: 0, critical: true,
    aarde:    { deep: "#b06040", light: "#e0b8a8" }, // terracotta
    koel:     { deep: "#3d6898", light: "#a2c0d6" }, // denim
    harmonie: { deep: "#4d8c8a", light: "#aed4d2" }, // gedempt teal
  },
  {
    id: "GF4", label: "Afwerking", start: 76, end: 100, progress: 0, critical: true,
    aarde:    { deep: "#8a6858", light: "#d0b8b0" }, // klei
    koel:     { deep: "#5a6880", light: "#bac4d0" }, // slate-blauw
    harmonie: { deep: "#a89048", light: "#ddd0a0" }, // soft amber
  },
  {
    id: "GF5", label: "Buitenterrein", start: 28.5, end: 58.8, progress: 15, critical: false,
    aarde:    { deep: "#9a9060", light: "#ddd8c0" }, // leem
    koel:     { deep: "#7868a0", light: "#c6bcd8" }, // lavender
    harmonie: { deep: "#3d6898", light: "#a2c0d6" }, // denim
  },
];

const MINI_ROW_H   = 42;
const MINI_BAR_TOP = 13;
const MINI_BAR_H   = 16;
const MINI_MILE_H  = 28;
const MINI_LABEL_W = 88;

function MiniGanttCard({
  palet,
  strategy,
  strategyLabel,
}: {
  palet: "aarde" | "koel" | "harmonie";
  strategy: "A" | "B";
  strategyLabel: string;
}) {
  const totalH = MINI_MILE_H + MINI_FASES.length * MINI_ROW_H;

  return (
    <div>
      <p className="text-xs font-semibold text-slate-700 mb-0.5">
        {strategy === "A" ? "A — Eenkleurig per fase" : "B — Universele baseline"}
      </p>
      <p className="text-[10px] text-slate-400 mb-2">{strategyLabel}</p>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex">
          {/* Labelkolom */}
          <div className="flex-none flex flex-col border-r border-slate-100" style={{ width: MINI_LABEL_W }}>
            <div style={{ height: MINI_MILE_H }} className="flex items-center px-2 border-b border-slate-200">
              <span className="text-[9px] text-slate-400 font-medium">Mijlpalen</span>
            </div>
            {MINI_FASES.map(fase => (
              <div
                key={fase.id}
                style={{
                  height: MINI_ROW_H,
                  borderLeft: fase.critical ? "3px solid #334155" : "3px solid transparent",
                }}
                className="flex items-center border-t border-slate-100"
              >
                <span className="text-[10px] font-medium text-slate-700 truncate px-2">
                  {fase.label}
                </span>
              </div>
            ))}
          </div>

          {/* Grafiekkolom */}
          <div className="flex-1 relative overflow-hidden" style={{ height: totalH }}>
            {/* Vandaag-lijn */}
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: `${MINI_VANDAAG_PCT}%`,
                width: 1.5,
                backgroundColor: "#3b82f6",
                opacity: 0.4,
                transform: "translateX(-50%)",
              }}
            />

            {/* Mijlpaalrij */}
            <div className="relative border-b border-slate-200" style={{ height: MINI_MILE_H }}>
              {MINI_MIJLPALEN_PCT.map((pct, i) =>
                pct <= 100 ? (
                  <div
                    key={i}
                    className="absolute border-2 border-white"
                    style={{
                      left: `${pct}%`,
                      top: "50%",
                      width: 10,
                      height: 10,
                      transform: "translate(-50%, -50%) rotate(45deg)",
                      backgroundColor: "#f59e0b",
                    }}
                  />
                ) : null
              )}
            </div>

            {/* Faserijen */}
            {MINI_FASES.map(fase => {
              const kleur = fase[palet];
              const bWidth = fase.end - fase.start;
              const pWidth = bWidth * (fase.progress / 100);
              const baselineColor = strategy === "A" ? kleur.light : "#e2e8f0";

              return (
                <div key={fase.id} style={{ height: MINI_ROW_H }} className="relative border-t border-slate-100">
                  {/* Baseline */}
                  <div
                    className="absolute"
                    style={{
                      left: `${fase.start}%`,
                      width: `${bWidth}%`,
                      top: MINI_BAR_TOP,
                      height: MINI_BAR_H,
                      backgroundColor: baselineColor,
                      borderRadius: 8,
                    }}
                  />
                  {/* Voortgang */}
                  {pWidth > 0 && (
                    <div
                      className="absolute"
                      style={{
                        left: `${fase.start}%`,
                        width: `${pWidth}%`,
                        top: MINI_BAR_TOP,
                        height: MINI_BAR_H,
                        backgroundColor: kleur.deep,
                        borderRadius: 8,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function GanttPaletteShowcase() {
  const paletInfo = [
    {
      key: "aarde" as const,
      naam: "1 — Aardetinten",
      omschrijving: "Sage groen · Gedempt brons · Terracotta · Klei · Leem",
    },
    {
      key: "koel" as const,
      naam: "2 — Koele tinten",
      omschrijving: "Gedempt teal · Indigo · Denim · Slate-blauw · Lavender",
    },
    {
      key: "harmonie" as const,
      naam: "3 — Gemengd harmonie",
      omschrijving: "Sage · Dusty rose · Gedempt teal · Soft amber · Denim",
    },
  ];

  return (
    <div className="mt-12 border-t-2 border-slate-300 pt-8 pb-16">
      <h2 className="text-lg font-bold text-slate-700 mb-1 px-8">
        Gantt palet-keuze — 4D
      </h2>
      <p className="text-xs text-slate-400 px-8 mb-1">
        Vaste Heel-project-weergave (feb–sep 2026). Donkere accentbalk links = kritiek pad. Amber ruiten = mijlpalen. Blauw = vandaag.
      </p>
      <p className="text-xs text-slate-400 px-8 mb-8">
        <strong className="text-slate-600">A</strong> = baseline in lichte fase-kleur, voortgang in diepere tint van dezelfde kleur.&nbsp;&nbsp;
        <strong className="text-slate-600">B</strong> = universele lichtgrijze baseline, voortgang in fase-kleur.
      </p>

      <div className="flex flex-col gap-10 px-8">
        {paletInfo.map(({ key, naam, omschrijving }) => (
          <div key={key}>
            <h3 className="text-sm font-semibold text-slate-800 mb-0.5">{naam}</h3>
            <p className="text-xs text-slate-400 mb-3">{omschrijving}</p>
            <div className="grid grid-cols-2 gap-5">
              <MiniGanttCard
                palet={key}
                strategy="A"
                strategyLabel="Baseline = lichte fase-tint"
              />
              <MiniGanttCard
                palet={key}
                strategy="B"
                strategyLabel="Baseline = universeel lichtgrijs"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 4E: TaskDetailPaneel showcase ────────────────────────────────────────────

const PANEL_DEMO_TASKS: ProjectTask[] = [
  {
    id: "TASK-001", subject: "Sloop", parentTask: null, isMilestone: false, isGroup: true,
    status: "Completed", progress: 100,
    expectedStartDate: new Date("2026-02-01"), expectedEndDate: new Date("2026-03-01"),
    actualStartDate: new Date("2026-02-03"), actualEndDate: new Date("2026-03-05"),
    budgetHours: 200, description: "Sloopwerkzaamheden inclusief asbest-inventarisatie.",
    dependsOn: [], assignedTo: ["r.dekker@example.nl"],
    wachtOp: null, wachtOpToelichting: null,
  },
  {
    id: "TASK-002", subject: "Ruwbouw", parentTask: null, isMilestone: false, isGroup: true,
    status: "Open", progress: 65,
    expectedStartDate: new Date("2026-03-02"), expectedEndDate: new Date("2026-05-01"),
    actualStartDate: new Date("2026-03-06"), actualEndDate: null,
    budgetHours: 900, description: "Betonvloer, metselwerk en dakafdekking.",
    dependsOn: ["TASK-001"], assignedTo: ["r.dekker@example.nl"],
    wachtOp: null, wachtOpToelichting: null,
  },
  {
    id: "TASK-002A", subject: "Betonvloer", parentTask: "TASK-002", isMilestone: false, isGroup: false,
    status: "Completed", progress: 100,
    expectedStartDate: new Date("2026-03-06"), expectedEndDate: new Date("2026-03-20"),
    actualStartDate: new Date("2026-03-06"), actualEndDate: new Date("2026-03-22"),
    budgetHours: 200, description: null,
    dependsOn: [], assignedTo: ["r.dekker@example.nl"],
    wachtOp: null, wachtOpToelichting: null,
  },
  {
    id: "TASK-002B", subject: "Metselwerk", parentTask: "TASK-002", isMilestone: false, isGroup: false,
    status: "Open", progress: 70,
    expectedStartDate: new Date("2026-03-23"), expectedEndDate: new Date("2026-04-18"),
    actualStartDate: new Date("2026-03-24"), actualEndDate: null,
    budgetHours: 480, description: null,
    dependsOn: ["TASK-002A"], assignedTo: ["r.dekker@example.nl"],
    wachtOp: null, wachtOpToelichting: null,
  },
  {
    id: "TASK-002C", subject: "Dakafdekking", parentTask: "TASK-002", isMilestone: false, isGroup: false,
    status: "Open", progress: 20,
    expectedStartDate: new Date("2026-04-19"), expectedEndDate: new Date("2026-05-01"),
    actualStartDate: null, actualEndDate: null,
    budgetHours: 220, description: null,
    dependsOn: ["TASK-002B"], assignedTo: [],
    wachtOp: "Materiaal", wachtOpToelichting: "Dakpannen verwacht week 19.",
  },
  {
    id: "TASK-003", subject: "Afbouw", parentTask: null, isMilestone: false, isGroup: true,
    status: "Open", progress: 10,
    expectedStartDate: new Date("2026-05-04"), expectedEndDate: new Date("2026-07-01"),
    actualStartDate: null, actualEndDate: null,
    budgetHours: 450, description: null,
    dependsOn: ["TASK-002"], assignedTo: [],
    wachtOp: "Materiaal", wachtOpToelichting: "Leverancier bevestigt levering week 24.",
  },
  {
    id: "TASK-004", subject: "Installatie", parentTask: null, isMilestone: false, isGroup: true,
    status: "Open", progress: 0,
    expectedStartDate: new Date("2026-06-01"), expectedEndDate: new Date("2026-07-15"),
    actualStartDate: null, actualEndDate: null,
    budgetHours: null, description: "E- en W-installaties door onderaannemer.",
    dependsOn: ["TASK-002"], assignedTo: [],
    wachtOp: "Onderaannemer", wachtOpToelichting: null,
  },
  {
    id: "TASK-005", subject: "Oplevering", parentTask: null, isMilestone: true, isGroup: false,
    status: "Open", progress: 0,
    expectedStartDate: new Date("2026-08-29"), expectedEndDate: new Date("2026-08-31"),
    actualStartDate: null, actualEndDate: null,
    budgetHours: null, description: null,
    dependsOn: ["TASK-003", "TASK-004"], assignedTo: ["m.janssen@example.nl"],
    wachtOp: null, wachtOpToelichting: null,
  },
];

const PANEL_DEMO_TIMESHEETS: TimesheetMap = {
  "TASK-001": 240,
  "TASK-002": 580,
  "TASK-003": 80,
};

function TaskDetailPaneelShowcase() {
  const [open, setOpen] = useState<{ id: string; mode: "task" | "phase" } | null>(null);

  return (
    <div className="mt-12 border-t-2 border-slate-300 pt-8 pb-16 px-8">
      <h2 className="text-lg font-bold text-slate-700 mb-1">
        Task detail-paneel — 4E
      </h2>
      <p className="text-xs text-slate-400 mb-6">
        Adaptief paneel: side-panel ≥1280px, bottom-sheet &lt;1280px. Klik de knoppen om Task-modus of Fase-modus te openen.
        Binnen het paneel klik je op afhankelijkheden om te navigeren.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <button
          type="button"
          onClick={() => setOpen({ id: "TASK-002", mode: "task" })}
          className="px-4 py-2 rounded-lg bg-y-teal text-white text-sm font-medium hover:bg-y-teal-dark transition-colors"
        >
          Open Task-modus (Ruwbouw, 65%)
        </button>
        <button
          type="button"
          onClick={() => setOpen({ id: "TASK-003", mode: "task" })}
          className="px-4 py-2 rounded-lg bg-slate-600 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          Open Task-modus (Afbouw, wacht-op)
        </button>
        <button
          type="button"
          onClick={() => setOpen({ id: "TASK-002", mode: "phase" })}
          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Open Fase-modus (Ruwbouw, 3 sub-taken)
        </button>
        <button
          type="button"
          onClick={() => setOpen({ id: "TASK-005", mode: "task" })}
          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Open Mijlpaal (Oplevering, 2 deps)
        </button>
      </div>

      <p className="text-xs text-slate-400">
        PROJ-0009 Renovatie Gemeentehuis Sliedrecht — 5 fases + timesheets geladen.
      </p>

      {open && (
        <TaskDetailPaneel
          key={open.id}
          tasks={PANEL_DEMO_TASKS}
          timesheets={PANEL_DEMO_TIMESHEETS}
          initialId={open.id}
          initialMode={open.mode}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

// ── 4F: Wacht-op showcase — vier scenario's ───────────────────────────────────

// Vier expliciete taken die elk scenario demonstreren (vóór enrichment)
const WACHT_OP_RAW: ProjectTask[] = [
  {
    // Scenario 1: geen wachtOp, geen blokkerende voorganger → niets getoond
    id: "WO-A", subject: "Binnenschilder", parentTask: null, isMilestone: false, isGroup: false,
    status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-11"), expectedEndDate: new Date("2026-05-15"),
    actualStartDate: null, actualEndDate: null, budgetHours: 40, description: null,
    dependsOn: ["WO-DONE"], assignedTo: [], wachtOp: null, wachtOpToelichting: null,
  },
  {
    // Voorganger (afgerond) — geen blokker voor WO-A
    id: "WO-DONE", subject: "Pleisterwerk", parentTask: null, isMilestone: false, isGroup: false,
    status: "Completed", progress: 100,
    expectedStartDate: new Date("2026-05-01"), expectedEndDate: new Date("2026-05-10"),
    actualStartDate: new Date("2026-05-01"), actualEndDate: new Date("2026-05-10"),
    budgetHours: 30, description: null,
    dependsOn: [], assignedTo: [], wachtOp: null, wachtOpToelichting: null,
  },
  {
    // Scenario 2: geen wachtOp, WÉL blokkerende open voorganger → auto-detectie
    id: "WO-B", subject: "Tegelwerk badkamer", parentTask: null, isMilestone: false, isGroup: false,
    status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-11"), expectedEndDate: new Date("2026-05-17"),
    actualStartDate: null, actualEndDate: null, budgetHours: 60, description: null,
    dependsOn: ["WO-BLOCKER"], assignedTo: [], wachtOp: null, wachtOpToelichting: null,
  },
  {
    // Blokkerende open voorganger voor WO-B
    id: "WO-BLOCKER", subject: "Leidingwerk sanitair", parentTask: null, isMilestone: false, isGroup: false,
    status: "Open", progress: 40,
    expectedStartDate: new Date("2026-05-11"), expectedEndDate: new Date("2026-05-17"),
    actualStartDate: null, actualEndDate: null, budgetHours: 50, description: null,
    dependsOn: [], assignedTo: [], wachtOp: null, wachtOpToelichting: null,
  },
  {
    // Scenario 3: handmatig custom_wacht_op = "Materiaal", geen blokkerende voorganger
    id: "WO-C", subject: "Dakisolatie", parentTask: null, isMilestone: false, isGroup: false,
    status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-11"), expectedEndDate: new Date("2026-05-20"),
    actualStartDate: null, actualEndDate: null, budgetHours: 80, description: null,
    dependsOn: [], assignedTo: [], wachtOp: "Materiaal", wachtOpToelichting: null,
  },
  {
    // Scenario 4: handmatig "Materiaal" + blokkerende voorganger → handmatig wint
    id: "WO-D", subject: "Vloerverwarming", parentTask: null, isMilestone: false, isGroup: false,
    status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-11"), expectedEndDate: new Date("2026-05-22"),
    actualStartDate: null, actualEndDate: null, budgetHours: 70, description: null,
    dependsOn: ["WO-BLOCKER"], assignedTo: [], wachtOp: "Materiaal", wachtOpToelichting: null,
  },
];

// Na enrichment: WO-B krijgt auto-detect "Voorgaande taak: Leidingwerk sanitair"
//                WO-D behoudt "Materiaal" (handmatig wint)
const WACHT_OP_TASKS = enrichTasksWithWachtOp(WACHT_OP_RAW);
const WACHT_OP_TIMESHEETS: TimesheetMap = {};

const SCENARIO_LABELS: Record<string, string> = {
  "WO-A": "Scenario 1 — geen wacht-op, voorganger afgerond → niets getoond",
  "WO-B": "Scenario 2 — auto-detectie: voorganger nog open",
  "WO-C": "Scenario 3 — handmatig: Materiaal",
  "WO-D": "Scenario 4 — conflict: handmatig + blokkerende dep → handmatig wint",
};

function WachtOpShowcase() {
  const [open, setOpen] = useState<{ id: string } | null>(null);

  return (
    <div className="mt-12 border-t-2 border-slate-300 pt-8 pb-16 px-8">
      <h2 className="text-lg font-bold text-slate-700 mb-1">Wacht op — 4F showcase</h2>
      <p className="text-xs text-slate-400 mb-6">
        Vier scenario's die de volledige dekkingsmatrix tonen. Klik op een rij om het detail-paneel te openen
        en de wacht-op-sectie daarin te verifiëren.
      </p>

      <div className="flex flex-col gap-6">
        {(["WO-A", "WO-B", "WO-C", "WO-D"] as const).map((id) => {
          const task = WACHT_OP_TASKS.find((t) => t.id === id)!;
          return (
            <div key={id}>
              <p className="text-xs font-semibold text-slate-500 mb-2">{SCENARIO_LABELS[id]}</p>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm max-w-sm overflow-hidden">
                <WerkvoorraadStrook
                  items={computeWerkvoorraad([task], WACHT_OP_TIMESHEETS, new Date("2026-05-11"))}
                  onItemClick={() => setOpen({ id })}
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-300">
                wachtOp na enrichment: {task.wachtOp ?? "(null)"} | toelichting: {task.wachtOpToelichting ?? "(null)"}
              </p>
            </div>
          );
        })}
      </div>

      {open && (
        <TaskDetailPaneel
          key={open.id}
          tasks={WACHT_OP_TASKS}
          timesheets={WACHT_OP_TIMESHEETS}
          initialId={open.id}
          initialMode="task"
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

// ── 5E: Kleurpalet per werksoort showcase ─────────────────────────────────────

const BM_KLEUREN: Record<string, { hex: string; label: string }> = {
  teal:       { hex: "#0A7384", label: "Teal"       },
  denim:      { hex: "#3D6B9E", label: "Denim"      },
  indigo:     { hex: "#4350A0", label: "Indigo"     },
  lavender:   { hex: "#635CA4", label: "Lavender"   },
  moss:       { hex: "#4A7850", label: "Moss"       },
  sage:       { hex: "#5E8B62", label: "Sage"       },
  amber:      { hex: "#B87528", label: "Amber"      },
  terracotta: { hex: "#AA5038", label: "Terracotta" },
  dustyRose:  { hex: "#A55868", label: "Dusty Rose" },
  slate:      { hex: "#5C6E7C", label: "Slate"      },
  stone:      { hex: "#787060", label: "Stone"      },
  charcoal:   { hex: "#58596A", label: "Charcoal"   },
};

// 6 kleuren per werksoort; kortere werksoorten gebruiken alleen de eerste N.
interface WerksoortPaletDef {
  naam: string;
  fases: string[];
  kleuren: (keyof typeof BM_KLEUREN)[];
}

const PALETTEN_5E: WerksoortPaletDef[] = [
  {
    naam: "Nieuwbouw",
    fases: ["Fundering & Grondwerk", "Ruwbouw & Constructie", "Installaties", "Afwerking", "Buitenterrein"],
    kleuren: ["moss", "terracotta", "denim", "slate", "sage", "stone"],
  },
  {
    naam: "Renovatie",
    fases: ["Sloop", "Constructie", "Installaties", "Afbouw", "Oplevering"],
    kleuren: ["terracotta", "teal", "indigo", "dustyRose", "sage", "slate"],
  },
  {
    naam: "Verbouw",
    fases: ["Opname", "Voorbereiding", "Ruwbouw", "Afbouw", "Oplevering"],
    kleuren: ["amber", "denim", "terracotta", "sage", "teal", "stone"],
  },
  {
    naam: "Sloop",
    fases: ["Inventarisatie", "Sloop", "Afvoer & Verwerking"],
    kleuren: ["slate", "terracotta", "stone", "indigo", "moss", "charcoal"],
  },
  {
    naam: "Sanering",
    fases: ["Onderzoek", "Sanering", "Vrijgave & Rapportage"],
    kleuren: ["denim", "lavender", "teal", "slate", "indigo", "stone"],
  },
  {
    naam: "Keukenbladen",
    fases: ["Order", "Inmeten", "Tekenen", "Productie", "Levering & Montage", "Service"],
    kleuren: ["teal", "denim", "lavender", "dustyRose", "amber", "sage"],
  },
  {
    naam: "Onderhoud",
    fases: ["Aanvraag", "Inspectie", "Uitvoering", "Oplevering"],
    kleuren: ["slate", "denim", "sage", "teal", "moss", "stone"],
  },
  {
    naam: "Anders",
    fases: [],
    kleuren: ["charcoal", "slate", "stone", "charcoal", "slate", "stone"],
  },
];

const Y_APP_TOKENS = [
  { label: "y-teal",       hex: "#006876" },
  { label: "y-teal-light", hex: "#99c2c8" },
  { label: "y-teal-dark",  hex: "#043b42" },
];

function PalettenShowcase5E() {
  return (
    <div className="mt-12 border-t-2 border-slate-300 pt-8 pb-20 px-8">
      <h2 className="text-lg font-bold text-slate-700 mb-1">5E — Kleurpalet per werksoort</h2>
      <p className="text-xs text-slate-400 mb-8 max-w-2xl">
        Gedeelde basis-set van 12 kleuren, harmonieus met de Y-App teal-tokens.
        Elk werksoort kiest een vaste subset van 6. Kortere werksoorten (Sloop, Sanering, Onderhoud)
        gebruiken alleen de eerste N slots. "Anders" krijgt neutrale grijstinten.
        <br />
        <strong className="text-slate-500">Dit is de showcase — nog geen implementatie in de Gantt.</strong>
      </p>

      {/* Y-App token referentie */}
      <div className="mb-8">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Y-App teal-tokens (referentie)
        </h3>
        <div className="flex gap-3">
          {Y_APP_TOKENS.map(({ label, hex }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div
                className="w-12 h-8 rounded"
                style={{ backgroundColor: hex }}
              />
              <span className="text-[10px] text-slate-500 font-mono">{label}</span>
              <span className="text-[10px] text-slate-400 font-mono">{hex}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Basis-set */}
      <div className="mb-10">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Basis-set (12 kleuren)
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(BM_KLEUREN).map(([key, { hex, label }]) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <div
                className="w-14 h-9 rounded shadow-sm"
                style={{ backgroundColor: hex }}
              />
              <span className="text-[10px] font-medium text-slate-600">{label}</span>
              <span className="text-[9px] text-slate-400 font-mono">{hex}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per werksoort */}
      <div className="flex flex-col gap-8">
        {PALETTEN_5E.map(({ naam, fases, kleuren }) => (
          <div key={naam}>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">{naam}</h3>
            <div className="flex gap-2">
              {kleuren.map((kleurKey, i) => {
                const { hex, label } = BM_KLEUREN[kleurKey];
                const faseNaam = fases[i];
                const isActief = faseNaam !== undefined;
                return (
                  <div key={i} className="flex flex-col gap-1" style={{ flex: "1 1 0", minWidth: 0 }}>
                    <div
                      className="rounded h-10 flex items-center justify-center"
                      style={{
                        backgroundColor: hex,
                        opacity: isActief ? 1 : 0.25,
                      }}
                    >
                      <span className="text-[10px] font-bold text-white/90 select-none">
                        {i + 1}
                      </span>
                    </div>
                    <p
                      className="text-[10px] leading-tight text-center"
                      style={{ color: isActief ? "#374151" : "#9ca3af" }}
                    >
                      {faseNaam ?? "—"}
                    </p>
                    <p className="text-[9px] text-slate-400 text-center font-mono leading-tight">
                      {label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
