import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Calendar, User, Hash } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { WERKSOORT_IDS } from "../../data/werksoort-config";
import { projectsService, quotationsService } from "../../data";
import type { UnlinkedQuotation } from "../../data/detail-types";
import type { Werksoort } from "../../data/types";

interface DoordrukkenWizardProps {
  quotation: UnlinkedQuotation;
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function DoordrukkenWizard({ quotation, onClose, onCreated }: DoordrukkenWizardProps) {
  const { t } = useTranslation();

  const [werksoort, setWerksoort] = useState<Werksoort>("Keukenbladen");
  const [projectName, setProjectName] = useState(`${quotation.customerName} — Keukenbladen`);
  const [startDate, setStartDate] = useState(
    quotation.meetdatum ? toIsoDate(quotation.meetdatum) : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ projectName: false });

  const projectNameError = touched.projectName && !projectName.trim();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, isSubmitting]);

  async function handleSubmit() {
    setTouched({ projectName: true });
    if (!projectName.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const newId = await projectsService.createProject({
        projectName: projectName.trim(),
        werksoort,
        customer: quotation.customerName,
        startDate: startDate || null,
      });
      await quotationsService.linkQuotationToProject(quotation.name, newId);
      onCreated(newId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "HOLIDAY_LIST_MISSING") {
        setSubmitError(t("wizard.error_holiday_list"));
      } else {
        setSubmitError(t("doordrukken.error_generic"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="doordrukken-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 id="doordrukken-title" className="text-base font-semibold text-slate-900">
              {t("doordrukken.title")}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t("doordrukken.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
            className="rounded-md p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal disabled:opacity-40"
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Opname-samenvatting */}
          <div className="rounded-lg bg-teal-50 border border-teal-100 px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">
              {t("doordrukken.summary_label")}
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <User size={13} className="text-teal-600 shrink-0" />
              {quotation.customerName}
            </div>
            {quotation.meetdatum && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Calendar size={13} className="text-teal-600 shrink-0" />
                {t("opname_card.meetdatum")} {formatDate(quotation.meetdatum)}
                {quotation.inmeter && (
                  <span className="text-slate-400">
                    · {t("opname_card.inmeter")} {quotation.inmeter}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Hash size={13} className="text-teal-600 shrink-0" />
              {t("opname_card.items", { count: quotation.itemCount })}
              <span className="font-mono text-xs text-slate-400 ml-1">{quotation.name}</span>
            </div>
          </div>

          {/* Werksoort */}
          <fieldset>
            <legend className="block text-sm font-medium text-slate-700 mb-2">
              {t("doordrukken.werksoort_label")}
            </legend>
            <div className="grid grid-cols-4 gap-2">
              {WERKSOORT_IDS.map((id) => {
                const checked = werksoort === id;
                return (
                  <label key={id} className="cursor-pointer">
                    <input
                      type="radio"
                      name="werksoort"
                      value={id}
                      checked={checked}
                      onChange={() => setWerksoort(id as Werksoort)}
                      className="sr-only"
                    />
                    <span
                      className={[
                        "flex items-center justify-center rounded-lg border-2 px-1.5 py-2",
                        "text-xs font-medium text-center leading-tight transition-colors select-none",
                        checked
                          ? "border-y-teal bg-teal-50 text-y-teal"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {t(`werksoort.${id.toLowerCase()}`)}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Projectnaam */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t("doordrukken.project_name_label")}
              <span aria-hidden="true" className="text-red-500 ml-0.5">*</span>
              {projectNameError && (
                <span className="ml-1.5 text-xs font-normal text-red-600">
                  {t("doordrukken.project_name_required")}
                </span>
              )}
            </label>
            <Input
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                if (e.target.value.trim()) setTouched({ projectName: false });
              }}
              onBlur={() => setTouched({ projectName: true })}
              className={projectNameError ? "border-red-300 focus:ring-red-400" : ""}
            />
          </div>

          {/* Klant — readonly weergave */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t("doordrukken.customer_label")}
            </label>
            <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
              {quotation.customerName}
            </div>
          </div>

          {/* Startdatum */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t("doordrukken.date_label")}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-y-teal focus:border-transparent"
            />
          </div>

          {submitError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 leading-snug">
              {submitError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? t("doordrukken.creating") : t("doordrukken.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}
