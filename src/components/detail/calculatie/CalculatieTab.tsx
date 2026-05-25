import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { projectDetailService } from "../../../data/project-detail-service";
import type { ProjectQuotation, QuotationItem } from "../../../data/detail-types";
import { QuotationCard } from "./QuotationCard";

interface CalculatieTabProps {
  /** ERPNext Customer-docname, gelijk aan Project.customer */
  customerName: string;
}

export function CalculatieTab({ customerName }: CalculatieTabProps) {
  const { t } = useTranslation();
  const [quotations, setQuotations] = useState<ProjectQuotation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    projectDetailService
      .getProjectQuotations(customerName)
      .then((data) => {
        if (!cancelled) setQuotations(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[CalculatieTab] getProjectQuotations mislukt:", err);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [customerName]);

  const handleSaveRate = useCallback(
    async (quotationName: string, rowName: string, newRate: number) => {
      // Optimistic update: pas de UI direct aan vóór de server-call
      setQuotations((prev) =>
        prev
          ? prev.map((q) =>
              q.name !== quotationName
                ? q
                : {
                    ...q,
                    items: q.items.map((item): QuotationItem =>
                      item.rowName !== rowName
                        ? item
                        : { ...item, rate: newRate, amount: item.qty * newRate },
                    ),
                  },
            )
          : prev,
      );

      // Bepaal de volledige actuele regellijst voor de ERPNext PUT
      const quote = quotations?.find((q) => q.name === quotationName);
      if (!quote) return;

      const updatedItems = quote.items.map((item): QuotationItem =>
        item.rowName !== rowName
          ? item
          : { ...item, rate: newRate, amount: item.qty * newRate },
      );

      await projectDetailService.updateQuotationItemRate(
        quotationName,
        rowName,
        newRate,
        updatedItems,
      );
    },
    [quotations],
  );

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
        {t("calculatie.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-red-500">
        {t("calculatie.error")}
      </div>
    );
  }

  if (!quotations || quotations.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-medium text-slate-600">
          {t("calculatie.empty_title")}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {t("calculatie.empty_body")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {quotations.map((quotation) => (
        <QuotationCard
          key={quotation.name}
          quotation={quotation}
          onSaveRate={(rowName, newRate) =>
            handleSaveRate(quotation.name, rowName, newRate)
          }
        />
      ))}
    </div>
  );
}
