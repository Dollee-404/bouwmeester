import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { projectDetailService } from "../../../data/project-detail-service";
import type { ProjectFinancials, SalesInvoice, InvoiceStatus } from "../../../data/detail-types";
import { fmtEuro } from "../kpi-helpers";

// ── Status badge ──────────────────────────────────────────────────────

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; text: string; labelKey: string }> = {
  Paid:           { bg: "bg-green-50",  text: "text-green-700",  labelKey: "financieel.status_paid" },
  Overdue:        { bg: "bg-red-50",    text: "text-red-700",    labelKey: "financieel.status_overdue" },
  Unpaid:         { bg: "bg-amber-50",  text: "text-amber-700",  labelKey: "financieel.status_unpaid" },
  "Partly Paid":  { bg: "bg-amber-50",  text: "text-amber-700",  labelKey: "financieel.status_partly_paid" },
  Return:         { bg: "bg-slate-100", text: "text-slate-600",  labelKey: "financieel.status_return" },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { t } = useTranslation();
  const { bg, text, labelKey } = STATUS_STYLE[status];
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}>
      {t(labelKey)}
    </span>
  );
}

// ── Contractsamenvatting ──────────────────────────────────────────────

function MetricCell({ label, value, valueColor = "text-slate-800" }: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-base font-semibold tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}

function ContractSamenvatting({ financials }: { financials: ProjectFinancials }) {
  const { t } = useTranslation();
  const openstaandColor = financials.openstaand < 0 ? "text-amber-600" : "text-slate-800";
  const openstaandFmt = financials.openstaand < 0
    ? `−${fmtEuro(Math.abs(financials.openstaand))}`
    : fmtEuro(financials.openstaand);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <MetricCell label={t("sidebar.contract_aanneemsom")} value={fmtEuro(financials.aanneemsom)} />
      <MetricCell
        label={t("sidebar.contract_meerwerk")}
        value={financials.meerwerk === 0 ? "—" : fmtEuro(financials.meerwerk)}
      />
      <MetricCell label={t("sidebar.contract_gefactureerd")} value={fmtEuro(financials.gefactureerd)} />
      <MetricCell
        label={t("sidebar.contract_openstaand")}
        value={openstaandFmt}
        valueColor={openstaandColor}
      />
    </div>
  );
}

// ── Factuurlijst ──────────────────────────────────────────────────────

function InvoiceRow({ invoice }: { invoice: SalesInvoice }) {
  const { t } = useTranslation();
  const fmtDate = (d: Date | null) =>
    d
      ? d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "—";

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
      <StatusBadge status={invoice.status} />

      <span className="font-mono text-xs text-slate-500 shrink-0">{invoice.name}</span>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
          <span>
            <span className="text-slate-400">{t("financieel.col_datum")} </span>
            {fmtDate(invoice.postingDate)}
          </span>
          {invoice.dueDate && (
            <span>
              <span className="text-slate-400">{t("financieel.col_vervaldatum")} </span>
              {fmtDate(invoice.dueDate)}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-4 tabular-nums text-xs shrink-0">
        <div className="text-right">
          <p className="text-slate-400">{t("financieel.col_bedrag")}</p>
          <p className="font-medium text-slate-800">{fmtEuro(invoice.grandTotal)}</p>
        </div>
        {invoice.outstandingAmount > 0 && (
          <div className="text-right">
            <p className="text-slate-400">{t("financieel.col_openstaand")}</p>
            <p className="font-medium text-red-600">{fmtEuro(invoice.outstandingAmount)}</p>
          </div>
        )}
      </div>
    </li>
  );
}

// ── Hoofd-component ───────────────────────────────────────────────────

interface FinancieelTabProps {
  projectId: string;
  financials: ProjectFinancials | null;
}

export function FinancieelTab({ projectId, financials }: FinancieelTabProps) {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<SalesInvoice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    projectDetailService
      .getProjectInvoices(projectId)
      .then((data) => {
        if (!cancelled) setInvoices(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[FinancieelTab] getProjectInvoices mislukt:", err);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [projectId]);

  return (
    <div className="flex flex-col gap-6">

      {financials && <ContractSamenvatting financials={financials} />}

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          {t("financieel.title_facturen")}
        </h3>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400 animate-pulse">
            {t("financieel.loading")}
          </div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-red-500">
            {t("financieel.error")}
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-slate-600">{t("financieel.empty_title")}</p>
            <p className="mt-1 text-xs text-slate-400">{t("financieel.empty_body")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
            {invoices.map((inv) => (
              <InvoiceRow key={inv.name} invoice={inv} />
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
