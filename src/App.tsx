import "./index.css";
import "./i18n/index";
import { SetupGate } from "./pages/SetupWizard";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, LayoutGrid, List, Hammer } from "lucide-react";

import { HOST_ORIGIN, INSTANCE_ID, ERPNEXT_URL, LANG } from "./bridge";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Input } from "./components/ui/input";
import { Select } from "./components/ui/select";
import { Avatar } from "./components/ui/avatar";
import { Toggle } from "./components/ui/toggle";
import { EmptyState } from "./components/ui/empty-state";
import { LoadingState } from "./components/ui/loading-state";
import { ToastProvider, useToast } from "./components/ui/toast";

function TestContent() {
  const { t, i18n } = useTranslation();
  const { addToast } = useToast();
  const [view, setView] = useState<"Board" | "Tabel">("Board");
  const [loading, setLoading] = useState(false);

  function triggerLoading() {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  }

  return (
    <div className="p-8 max-w-3xl mx-auto flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-y-teal-dark">
        Bouwmeester — Fase 1 testpagina
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
          status.Lead: <strong>{t("status.Lead")}</strong>
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
  );
}

export default function App() {
  return (
    <ToastProvider>
      <SetupGate>
        <TestContent />
      </SetupGate>
    </ToastProvider>
  );
}
