import { X, ArrowLeft, MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProjectDetail } from "../../data/detail-types";
import { WerksoortBadge, StatusBadge } from "../ui/badge";
import { StatusFlow } from "./StatusFlow";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";

interface PanelHeaderProps {
  detail: ProjectDetail;
  onClose: () => void;
  isFullPage: boolean;
}

const ACTION_KEYS = ["panel.action_uren", "panel.action_factureren", "panel.action_actie"] as const;

export function PanelHeader({ detail, onClose, isFullPage }: PanelHeaderProps) {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const showBanner = detail.status === "Verloren" || detail.status === "Geannuleerd";
  const bannerKey = detail.status === "Verloren" ? "panel.project_lost" : "panel.project_cancelled";

  function handleActionClick() {
    addToast(t("common.not_available"), "info");
  }

  return (
    <div className="shrink-0 border-b border-slate-200">

      {/* Banner: Verloren / Geannuleerd */}
      {showBanner && (
        <div className="flex items-center gap-2 bg-red-50 border-b border-red-100 px-6 py-2.5">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium text-red-700">{t(bannerKey)}</span>
        </div>
      )}

      {/* Rij 1: identificatie + sluiten */}
      <div className="flex items-center gap-2 px-6 pt-4 pb-2">
        {isFullPage ? (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal rounded"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            {t("panel.back")}
          </button>
        ) : (
          <>
            <span className="font-mono text-xs text-slate-500 shrink-0">{detail.id}</span>
            <WerksoortBadge werksoort={detail.werksoort} />
            <StatusBadge status={detail.status} />
            <div className="ml-auto flex items-center gap-0.5">
              <button
                onClick={handleActionClick}
                aria-label="Menu"
                className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal"
              >
                <MoreVertical size={16} />
              </button>
              <button
                onClick={onClose}
                aria-label={t("panel.close_label")}
                className="p-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal"
              >
                <X size={18} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Rij 2: projectnaam + subtitel */}
      <div className="px-6 pb-3">
        <h2 className="text-2xl font-semibold text-slate-900 leading-tight">{detail.projectName}</h2>
        <p className="text-sm text-slate-500 mt-0.5 truncate">
          {detail.customerName}
          {detail.customerAddress && <> · {detail.customerAddress}</>}
        </p>
      </div>

      {/* Rij 3: StatusFlow */}
      <div className="px-6 pb-3">
        <StatusFlow currentStatus={detail.status} werksoort={detail.werksoort} />
      </div>

      {/* Rij 4: placeholder-actieknoppen */}
      <div className="flex items-center gap-2 px-6 pb-4">
        {ACTION_KEYS.map((key) => (
          <Button key={key} variant="secondary" size="sm" onClick={handleActionClick}>
            {t(key)}
          </Button>
        ))}
      </div>
    </div>
  );
}
