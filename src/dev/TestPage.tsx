import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, LayoutGrid, List, Hammer } from "lucide-react";
import { SituatieStrook, type SituatieStrookProps } from "../components/detail/planning/SituatieStrook";
import { WerkvoorraadStrook } from "../components/detail/planning/WerkvoorraadStrook";
import { computeWerkvoorraad } from "../components/detail/planning/werkvoorraad-logica";
import type { WerkvoorraadItem } from "../components/detail/planning/werkvoorraad-logica";
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
    wachtOp: null, wachtOpToelichting: null },

  // Criterium 1: start vandaag (maandag 11 mei)
  { id: "S2", subject: "Fundering gieten [start vandaag]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-11"), expectedEndDate: new Date("2026-05-20"),
    budgetHours: 8, dependsOn: [], assignedTo: ["m.janssen@test.nl"],
    wachtOp: null, wachtOpToelichting: null },

  // Criterium 2: einddatum vrijdag 15 mei (deze week), discrepantie (13.5u/16u, 60%)
  { id: "S3", subject: "Stucwerk [klaar vóór vrijdag + discrepantie]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 60,
    expectedStartDate: new Date("2026-05-04"), expectedEndDate: new Date("2026-05-15"),
    budgetHours: 16, dependsOn: [], assignedTo: [],
    wachtOp: null, wachtOpToelichting: null },

  // Criterium 4: kan starten — S5 (dep) is Completed, start 11 mei ≤ weekEnd 17 mei
  { id: "S4", subject: "Isolatiewerk [kan starten — dep S5 is klaar]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-11"), expectedEndDate: new Date("2026-05-22"),
    budgetHours: 12, dependsOn: ["S5"], assignedTo: ["p.bakker@test.nl"],
    wachtOp: null, wachtOpToelichting: null },

  // Afgeronde dep voor S4 — zelf NIET in werkvoorraad
  { id: "S5", subject: "Fundering [Completed — dep van S4, NIET in lijst]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Completed", progress: 100,
    expectedStartDate: new Date("2026-04-20"), expectedEndDate: new Date("2026-05-08"),
    budgetHours: 20, dependsOn: [], assignedTo: [],
    wachtOp: null, wachtOpToelichting: null },

  // Criterium 5: mijlpaal zondag 17 mei (6 dagen)
  { id: "S6", subject: "Oplevering ruwbouw [mijlpaal over 6d]",
    parentTask: null, isMilestone: true, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: null, expectedEndDate: new Date("2026-05-17"),
    budgetHours: null, dependsOn: [], assignedTo: ["j.smit@test.nl"],
    wachtOp: null, wachtOpToelichting: null },

  // UITGESLOTEN: toekomstige start buiten week, geen deps, geen mijlpaal
  { id: "S7", subject: "Toekomstig werk [GEEN kwalificatie — start 1 jun]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-06-01"), expectedEndDate: new Date("2026-06-30"),
    budgetHours: null, dependsOn: [], assignedTo: [],
    wachtOp: null, wachtOpToelichting: null },

  // UITGESLOTEN: isGroup = true
  { id: "S8", subject: "Fase A [GEEN kwalificatie — groeptaak]",
    parentTask: null, isMilestone: false, isGroup: true, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-11"), expectedEndDate: new Date("2026-05-30"),
    budgetHours: null, dependsOn: [], assignedTo: [],
    wachtOp: null, wachtOpToelichting: null },

  // Extra taken → 12 kwalificerende items zodat "+5 meer" aantoonbaar werkt op echte logica
  { id: "S9", subject: "Dakgoten installeren [start morgen]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-12"), expectedEndDate: new Date("2026-05-19"),
    budgetHours: null, dependsOn: [], assignedTo: ["a.visser@test.nl"],
    wachtOp: null, wachtOpToelichting: null },
  { id: "S10", subject: "Tegelwerk badkamer [start woensdag]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-13"), expectedEndDate: new Date("2026-05-22"),
    budgetHours: null, dependsOn: [], assignedTo: [],
    wachtOp: null, wachtOpToelichting: null },
  { id: "S11", subject: "Schilderwerk trapportaal [start donderdag]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-14"), expectedEndDate: new Date("2026-05-21"),
    budgetHours: null, dependsOn: [], assignedTo: ["m.janssen@test.nl"],
    wachtOp: null, wachtOpToelichting: null },
  { id: "S12", subject: "Parketvloer leggen [klaar vóór woensdag]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 50,
    expectedStartDate: new Date("2026-05-04"), expectedEndDate: new Date("2026-05-13"),
    budgetHours: null, dependsOn: [], assignedTo: ["jan.de.vries@test.nl"],
    wachtOp: null, wachtOpToelichting: null },
  { id: "S13", subject: "Elektrische installatie [klaar vóór donderdag]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 30,
    expectedStartDate: new Date("2026-05-06"), expectedEndDate: new Date("2026-05-14"),
    budgetHours: null, dependsOn: [], assignedTo: [],
    wachtOp: null, wachtOpToelichting: null },
  { id: "S14", subject: "Vloerverwarming leggen [kan starten — dep S15 klaar]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: new Date("2026-05-13"), expectedEndDate: new Date("2026-05-20"),
    budgetHours: null, dependsOn: ["S15"], assignedTo: ["p.bakker@test.nl"],
    wachtOp: null, wachtOpToelichting: null },
  // Completed dep voor S14 — NIET in werkvoorraad
  { id: "S15", subject: "Betonvloer [Completed — dep van S14, NIET in lijst]",
    parentTask: null, isMilestone: false, isGroup: false, status: "Completed", progress: 100,
    expectedStartDate: new Date("2026-04-25"), expectedEndDate: new Date("2026-05-09"),
    budgetHours: null, dependsOn: [], assignedTo: [],
    wachtOp: null, wachtOpToelichting: null },
  { id: "S16", subject: "Sleuteloverdracht [mijlpaal volgende week]",
    parentTask: null, isMilestone: true, isGroup: false, status: "Open", progress: 0,
    expectedStartDate: null, expectedEndDate: new Date("2026-05-21"),
    budgetHours: null, dependsOn: [], assignedTo: [],
    wachtOp: null, wachtOpToelichting: null },
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
