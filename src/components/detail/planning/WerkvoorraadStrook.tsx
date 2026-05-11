import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Clock } from "lucide-react";
import { Avatar } from "../../ui/avatar";
import type { WerkvoorraadItem, WerkvoorraadReden } from "./werkvoorraad-logica";

export type { WerkvoorraadItem, WerkvoorraadReden };

const MAX_ZICHTBAAR = 7;

// ── Tag-configuratie — drie kleur-families ────────────────────────────────────
// Rood (let op): achterstallig
// Amber (binnenkort): start vandaag · klaar vóór · mijlpaal
// Neutraal: start [dag] · kan starten · alle wacht-op-varianten

function tagConfig(
  reden: WerkvoorraadReden,
  t: TFunction,
): { label: string; className: string; tooltip?: string } {
  switch (reden.type) {
    case "achterstallig":
      return { label: t("planning.werkvoorraad.achterstallig"), className: "text-red-600" };
    case "start-vandaag":
      return { label: t("planning.werkvoorraad.start_vandaag"), className: "text-amber-600" };
    case "start-morgen":
      return { label: t("planning.werkvoorraad.start_morgen"), className: "text-slate-400" };
    case "start-dag":
      return { label: t("planning.werkvoorraad.start_dag", { dag: reden.dag }), className: "text-slate-400" };
    case "klaar-voor":
      return { label: t("planning.werkvoorraad.klaar_voor", { dag: reden.dag }), className: "text-amber-600" };
    case "mijlpaal":
      return {
        label: reden.overDagen === 0
          ? t("planning.werkvoorraad.mijlpaal_vandaag")
          : t("planning.werkvoorraad.mijlpaal_over", { n: reden.overDagen }),
        className: "text-amber-600",
      };
    case "vrijgekomen":
      return { label: t("planning.werkvoorraad.kan_starten"), className: "text-slate-400" };
    case "wacht-op":
      return { label: reden.label, className: "text-slate-400", tooltip: reden.tooltip };
  }
}

// ── Avatar-helper: email → leesbare naam voor initialen ──────────────────────

function displayName(email: string): string {
  const local = email.split("@")[0];
  return local.replace(/[._-]/g, " ");
}

// ── Item-rij ──────────────────────────────────────────────────────────────────

function WerkvoorraadRij({
  item,
  onClick,
}: {
  item: WerkvoorraadItem;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const tag = tagConfig(item.reden, t);

  return (
    <div
      className="flex items-start gap-3 py-4 px-5 cursor-pointer hover:bg-slate-50 transition-colors"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 leading-snug truncate">
          {item.subject}
        </p>
        <p className={`mt-1 text-xs font-medium ${tag.className}`} title={tag.tooltip}>
          {tag.label}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        {item.heeftDiscrepantie && (
          <span title="Bestede uren ≥ 80% van schatting, voortgang < 80%">
            <Clock size={13} className="text-amber-500" aria-label="uren lopen uit" />
          </span>
        )}
        {item.assignedTo ? (
          <Avatar name={displayName(item.assignedTo)} size="sm" />
        ) : (
          <span className="text-xs text-slate-400 font-medium">n.t.b.</span>
        )}
      </div>
    </div>
  );
}

// ── Hoofd-component ───────────────────────────────────────────────────────────

export interface WerkvoorraadStrookProps {
  items: WerkvoorraadItem[];
  onItemClick?: (id: string) => void;
}

export function WerkvoorraadStrook({ items, onItemClick }: WerkvoorraadStrookProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return (
      <div className="mt-6 py-8 text-center">
        <p className="text-sm text-slate-400">{t("planning.werkvoorraad.leeg")}</p>
      </div>
    );
  }

  const zichtbaar = expanded ? items : items.slice(0, MAX_ZICHTBAAR);
  const rest = items.length - MAX_ZICHTBAAR;

  return (
    <div className="mt-6">
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden shadow-sm">
        {zichtbaar.map((item) => (
          <WerkvoorraadRij
            key={item.id}
            item={item}
            onClick={onItemClick ? () => onItemClick(item.id) : undefined}
          />
        ))}

        {!expanded && rest > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full py-3 text-center text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {t("planning.werkvoorraad.meer", { count: rest })}
          </button>
        )}
      </div>
    </div>
  );
}
