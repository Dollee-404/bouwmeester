import type React from "react";
import { Calendar, User, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UnlinkedQuotation } from "../../data/detail-types";

interface OpnameCardProps {
  quotation: UnlinkedQuotation;
  onDoordrukken: (quotation: UnlinkedQuotation) => void;
  tabIndex?: number;
}

const KEUKENBLADEN_DEEP = "#0A7384";
const KEUKENBLADEN_LIGHT = "#C2DCE0";

function formatDate(date: Date): string {
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export function OpnameCard({ quotation, onDoordrukken, tabIndex = 0 }: OpnameCardProps) {
  const { t } = useTranslation();

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onDoordrukken(quotation);
    }
  }

  return (
    <div
      role="button"
      tabIndex={tabIndex}
      aria-label={`Opname ${quotation.customerName} doordrukken`}
      className="cursor-pointer hover:shadow-md transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal focus-visible:ring-offset-1"
      style={{
        backgroundColor: "#f0f9fa",
        borderTop: `0.5px solid ${KEUKENBLADEN_LIGHT}`,
        borderRight: `0.5px solid ${KEUKENBLADEN_LIGHT}`,
        borderBottom: `0.5px solid ${KEUKENBLADEN_LIGHT}`,
        borderLeft: `3px solid ${KEUKENBLADEN_DEEP}`,
        borderRadius: "0 8px 8px 0",
        padding: "12px",
      }}
      onClick={() => onDoordrukken(quotation)}
      onKeyDown={handleKeyDown}
    >
      {/* Row 1: badge + docname */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: KEUKENBLADEN_LIGHT, color: KEUKENBLADEN_DEEP }}
        >
          {t("opname_card.badge")}
        </span>
        <span className="text-[11px] font-mono text-slate-400">{quotation.name}</span>
      </div>

      {/* Row 2: klant */}
      <div className="mb-2">
        <p className="text-[14px] font-medium text-slate-900 leading-snug line-clamp-2">
          {quotation.customerName}
        </p>
      </div>

      {/* Row 3: meetdatum */}
      {quotation.meetdatum && (
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500 mb-1">
          <Calendar size={12} className="shrink-0" aria-hidden="true" />
          <span>
            {t("opname_card.meetdatum")} {formatDate(quotation.meetdatum)}
          </span>
        </div>
      )}

      {/* Row 4: inmeter + regelaantal */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2.5">
        {quotation.inmeter ? (
          <span className="flex items-center gap-1">
            <User size={11} aria-hidden="true" />
            {quotation.inmeter}
          </span>
        ) : (
          <span />
        )}
        <span>{t("opname_card.items", { count: quotation.itemCount })}</span>
      </div>

      {/* Row 5: doordrukken-actie */}
      <div className="flex items-center justify-end">
        <span
          className="flex items-center gap-1 text-[12px] font-medium"
          style={{ color: KEUKENBLADEN_DEEP }}
        >
          {t("opname_card.doordrukken")}
          <ArrowRight size={13} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
