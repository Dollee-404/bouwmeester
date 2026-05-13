import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { WERKSOORT_IDS } from "../../data/werksoort-config";
import { projectsService } from "../../data";
import { fetchList } from "../../bridge";
import type { Werksoort } from "../../data/types";

interface NewProjectWizardProps {
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

interface CustomerOption {
  name: string;
  customer_name: string;
}

export function NewProjectWizard({ onClose, onCreated }: NewProjectWizardProps) {
  const { t } = useTranslation();

  const [werksoort, setWerksoort] = useState<Werksoort | null>(null);
  const [projectName, setProjectName] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerValue, setCustomerValue] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");

  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);
  const customerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ werksoort: false, projectName: false });

  const werksoortError = touched.werksoort && !werksoort;
  const projectNameError = touched.projectName && !projectName.trim();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, isSubmitting]);

  const searchCustomers = useCallback((q: string) => {
    if (customerTimer.current) clearTimeout(customerTimer.current);
    if (!q.trim()) {
      setCustomerOptions([]);
      setCustomerOpen(false);
      return;
    }
    customerTimer.current = setTimeout(async () => {
      setCustomerLoading(true);
      try {
        const results = await fetchList<CustomerOption>("Customer", {
          fields: ["name", "customer_name"],
          filters: [["customer_name", "like", `%${q}%`]],
          limit_page_length: 8,
          order_by: "customer_name asc",
        });
        setCustomerOptions(results);
        setCustomerOpen(results.length > 0);
      } catch {
        setCustomerOptions([]);
      } finally {
        setCustomerLoading(false);
      }
    }, 300);
  }, []);

  function handleCustomerInput(value: string) {
    setCustomerSearch(value);
    setCustomerValue(null);
    searchCustomers(value);
  }

  function handleCustomerSelect(option: CustomerOption) {
    setCustomerSearch(option.customer_name);
    setCustomerValue(option.name);
    setCustomerOpen(false);
  }

  async function handleSubmit() {
    setTouched({ werksoort: true, projectName: true });
    if (!werksoort || !projectName.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const newId = await projectsService.createProject({
        projectName: projectName.trim(),
        werksoort,
        customer: customerValue,
        startDate: startDate || null,
      });
      onCreated(newId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "HOLIDAY_LIST_MISSING") {
        setSubmitError(t("wizard.error_holiday_list"));
      } else {
        setSubmitError(t("wizard.error_generic"));
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
      aria-labelledby="wizard-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 id="wizard-title" className="text-base font-semibold text-slate-900">
            {t("wizard.title")}
          </h2>
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

          {/* Werksoort */}
          <fieldset>
            <legend className="block text-sm font-medium text-slate-700 mb-2">
              {t("wizard.werksoort_label")}
              {werksoortError && (
                <span className="ml-1.5 text-xs font-normal text-red-600">
                  {t("wizard.werksoort_required")}
                </span>
              )}
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
                      onChange={() => {
                        setWerksoort(id as Werksoort);
                        setTouched((t) => ({ ...t, werksoort: false }));
                      }}
                      className="sr-only"
                    />
                    <span
                      className={[
                        "flex items-center justify-center rounded-lg border-2 px-1.5 py-2",
                        "text-xs font-medium text-center leading-tight transition-colors select-none",
                        checked
                          ? "border-y-teal bg-teal-50 text-y-teal"
                          : werksoortError
                            ? "border-red-200 text-slate-600 hover:border-red-300"
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
              {t("wizard.name_label")}
              <span aria-hidden="true" className="text-red-500 ml-0.5">*</span>
              {projectNameError && (
                <span className="ml-1.5 text-xs font-normal text-red-600">
                  {t("wizard.name_required")}
                </span>
              )}
            </label>
            <Input
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                if (e.target.value.trim()) setTouched((t) => ({ ...t, projectName: false }));
              }}
              onBlur={() => setTouched((t) => ({ ...t, projectName: true }))}
              placeholder={t("wizard.name_placeholder")}
              className={projectNameError ? "border-red-300 focus:ring-red-400" : ""}
            />
          </div>

          {/* Klant */}
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t("wizard.customer_label")}
            </label>
            <Input
              value={customerSearch}
              onChange={(e) => handleCustomerInput(e.target.value)}
              onFocus={() => customerOptions.length > 0 && setCustomerOpen(true)}
              onBlur={() => setTimeout(() => setCustomerOpen(false), 150)}
              placeholder={t("wizard.customer_placeholder")}
              autoComplete="off"
            />
            {(customerOpen || customerLoading) && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-44 overflow-y-auto">
                {customerLoading ? (
                  <div className="px-3 py-2 text-sm text-slate-400">{t("common.loading")}</div>
                ) : customerOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-400">
                    {t("wizard.customer_no_results")}
                  </div>
                ) : (
                  customerOptions.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:bg-slate-50"
                      onMouseDown={(e) => { e.preventDefault(); handleCustomerSelect(c); }}
                    >
                      {c.customer_name}
                      {c.name !== c.customer_name && (
                        <span className="ml-2 text-xs text-slate-400">{c.name}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Startdatum */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t("wizard.date_label")}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-y-teal focus:border-transparent"
            />
          </div>

          {/* Foutmelding */}
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
            {isSubmitting ? t("wizard.creating") : t("wizard.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}
