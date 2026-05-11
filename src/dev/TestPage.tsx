import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, LayoutGrid, List, Hammer } from "lucide-react";

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
  </>
  );
}
