import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, Circle, Download, Mail, RefreshCw, Loader2 } from "lucide-react";
import {
  checkRequiredFields,
  isSystemManager,
  installCustomFields,
  downloadFieldsJson,
} from "../data/setup-check";
import { REQUIRED_CUSTOM_FIELDS, type CustomFieldSpec } from "../data/custom-fields-spec";
import { Button } from "../components/ui/button";
import { LoadingState } from "../components/ui/loading-state";

type Screen = "checking" | "welcome" | "installing" | "no-permission" | "error";

interface SetupGateProps {
  children: ReactNode;
}

export function SetupGate({ children }: SetupGateProps) {
  const [screen, setScreen] = useState<Screen>("checking");
  const [ready, setReady] = useState(false);
  const [missingFields, setMissingFields] = useState<CustomFieldSpec[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [installedFields, setInstalledFields] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState("");
  const { t } = useTranslation();

  async function runCheck() {
    setScreen("checking");
    setReady(false);
    try {
      const result = await checkRequiredFields();
      if (result.complete) {
        setReady(true);
      } else {
        setMissingFields(result.missing);
        const perm = await isSystemManager();
        setHasPermission(perm);
        setScreen("welcome");
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
      setScreen("error");
    }
  }

  useEffect(() => { runCheck(); }, []);

  async function handleInstall() {
    if (!hasPermission) {
      setScreen("no-permission");
      return;
    }
    setInstalledFields(new Set());
    setScreen("installing");
    try {
      await installCustomFields(missingFields, (fieldname) => {
        setInstalledFields((prev) => new Set([...prev, fieldname]));
      });
      // Auto-doorklik na 1 seconde
      setTimeout(() => setReady(true), 1000);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
      setScreen("error");
    }
  }

  function handleMailAdmin() {
    const subject = encodeURIComponent("Bouwmeester installatie vereist");
    const body = encodeURIComponent(
      "Hallo,\n\nKun je het bijgevoegde bouwmeester-custom-fields.json importeren in ERPNext via:\nCustomize Form → Import Fields?\n\nZonder deze velden kan Bouwmeester geen projecten tonen.\n\nDankjewel.",
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  const fieldLabel: Record<string, string> = {
    custom_bouwmeester_status: t("setup.field_custom_bouwmeester_status"),
    custom_werksoort: t("setup.field_custom_werksoort"),
    custom_budget_hours: t("setup.field_custom_budget_hours"),
    custom_weersafhankelijk: t("setup.field_custom_weersafhankelijk"),
  };

  if (ready) return <>{children}</>;

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-md w-full p-8">

        {screen === "checking" && (
          <LoadingState message={t("common.loading")} />
        )}

        {screen === "welcome" && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">
                {t("setup.title")}
              </h1>
              <p className="text-sm text-slate-600">{t("setup.intro")}</p>
            </div>

            <ul className="flex flex-col gap-2.5">
              {REQUIRED_CUSTOM_FIELDS.map((f) => (
                <li key={f.fieldname} className="flex items-center gap-3 text-sm text-slate-700">
                  <Circle size={15} className="text-slate-300 shrink-0" />
                  <span>
                    <span className="font-medium">{fieldLabel[f.fieldname] ?? f.label}</span>
                    <span className="text-slate-400 ml-1.5 text-xs font-mono">
                      {f.fieldtype}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <Button variant="primary" onClick={handleInstall}>
              {t("setup.install")}
            </Button>
          </div>
        )}

        {screen === "installing" && (
          <div className="flex flex-col gap-5">
            <h1 className="text-xl font-bold text-slate-900">
              {t("setup.installing")}
            </h1>
            <ul className="flex flex-col gap-3">
              {REQUIRED_CUSTOM_FIELDS.map((f) => {
                const done = installedFields.has(f.fieldname);
                return (
                  <li key={f.fieldname} className="flex items-center gap-3 text-sm">
                    {done ? (
                      <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <Loader2 size={16} className="text-slate-300 animate-spin shrink-0" />
                    )}
                    <span className={done ? "text-slate-900 font-medium" : "text-slate-400"}>
                      {fieldLabel[f.fieldname] ?? f.label}
                    </span>
                  </li>
                );
              })}
            </ul>
            {installedFields.size === REQUIRED_CUSTOM_FIELDS.length && (
              <p className="text-sm text-emerald-600 font-medium">
                {t("setup.install_success")}
              </p>
            )}
          </div>
        )}

        {screen === "no-permission" && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">
                {t("setup.no_permission_title")}
              </h1>
              <p className="text-sm text-slate-600">
                {t("setup.no_permission_body")}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={() => downloadFieldsJson(REQUIRED_CUSTOM_FIELDS)}
              >
                <Download size={14} />
                {t("setup.download_json")}
              </Button>
              <Button variant="secondary" onClick={handleMailAdmin}>
                <Mail size={14} />
                {t("setup.contact_admin")}
              </Button>
              <Button variant="ghost" onClick={runCheck}>
                <RefreshCw size={14} />
                {t("setup.recheck")}
              </Button>
            </div>
          </div>
        )}

        {screen === "error" && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-bold text-red-600 mb-2">
                {t("common.error")}
              </h1>
              <p className="text-xs text-slate-500 font-mono bg-slate-50 rounded-lg p-3 break-all">
                {errorMessage}
              </p>
            </div>
            <Button variant="primary" onClick={runCheck}>
              <RefreshCw size={14} />
              {t("common.retry")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
