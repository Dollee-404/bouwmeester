import { useTranslation } from "react-i18next";
import { FileDown } from "lucide-react";
import type { ProjectQuotation } from "../../../data/detail-types";
import { ERPNEXT_URL } from "../../../bridge";
import { QuotationItemsTable } from "./QuotationItemsTable";

interface QuotationCardProps {
  quotation: ProjectQuotation;
  onSaveRate: (rowName: string, newRate: number) => Promise<void>;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function QuotationCard({ quotation, onSaveRate }: QuotationCardProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center gap-x-6 gap-y-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-medium text-slate-500">
            {t("calculatie.aangemaakt")}
          </span>
          <span className="text-sm text-slate-700">
            {formatDate(quotation.transactionDate)}
          </span>
        </div>
        {quotation.meetdatum && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-medium text-slate-500">
              {t("calculatie.meetdatum")}
            </span>
            <span className="text-sm text-slate-700">
              {formatDate(quotation.meetdatum)}
            </span>
          </div>
        )}
        {quotation.inmeter && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-medium text-slate-500">
              {t("calculatie.inmeter")}
            </span>
            <span className="text-sm text-slate-700">{quotation.inmeter}</span>
          </div>
        )}
        {quotation.tekenPdf && (
          <a
            href={`${ERPNEXT_URL}${quotation.tekenPdf}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-y-teal hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal rounded"
          >
            <FileDown size={13} aria-hidden />
            {t("calculatie.tekening")}
          </a>
        )}
        <span className="ml-auto text-xs font-mono text-slate-400">
          {quotation.name}
        </span>
      </div>

      <div className="px-4 py-4">
        <QuotationItemsTable
          quotationName={quotation.name}
          items={quotation.items}
          onSaveRate={onSaveRate}
        />
      </div>
    </div>
  );
}
