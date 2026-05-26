import { Fragment } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BouwmeesterStatus } from "../../data/types";
import type { Werksoort } from "../../data/types";
import { STATUS_ORDER, STATUS_LABEL_KEYS } from "../kanban/status-config";
import { getWerksoortConfig } from "../../data/werksoort-config";

interface StatusFlowProps {
  currentStatus: BouwmeesterStatus;
  werksoort?: Werksoort | null;
}

export function StatusFlow({ currentStatus, werksoort }: StatusFlowProps) {
  const { t } = useTranslation();

  const config = getWerksoortConfig(werksoort);
  const flow = config.statusFlow
    ? config.statusFlow
    : STATUS_ORDER.map((status) => ({ status }));

  // Verloren/Geannuleerd zijn niet in de flow → currentIdx = -1 → alle stappen grijs
  const currentIdx = flow.findIndex((step) => step.status === currentStatus);

  return (
    <div className="flex items-start" aria-label="Projectstatus">
      {flow.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const label = step.label ?? t(STATUS_LABEL_KEYS[step.status]);

        return (
          <Fragment key={`${step.status}-${idx}`}>
            {idx > 0 && (
              <div
                className={`flex-1 h-0.5 mt-3 ${idx <= currentIdx ? "bg-y-teal" : "bg-slate-200"}`}
                aria-hidden="true"
              />
            )}

            <div className="flex flex-col items-center shrink-0">
              <div
                className={[
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold",
                  isDone    ? "bg-y-teal text-white" : "",
                  isCurrent ? "bg-y-teal text-white ring-2 ring-y-teal/25 ring-offset-1" : "",
                  !isDone && !isCurrent ? "bg-slate-100 text-slate-400" : "",
                ].join(" ")}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isDone
                  ? <Check size={11} strokeWidth={2.5} aria-hidden="true" />
                  : idx + 1
                }
              </div>
              <span
                className={[
                  "mt-1 text-[9px] leading-tight text-center max-w-[54px]",
                  isDone || isCurrent ? "text-slate-700 font-medium" : "text-slate-400",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
