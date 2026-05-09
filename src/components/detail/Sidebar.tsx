import { useTranslation } from "react-i18next";
import type { ProjectDetail, ProjectFinancials } from "../../data/detail-types";
import { Avatar } from "../ui/avatar";
import { WerksoortBadge } from "../ui/badge";
import { fmtEuro } from "./kpi-helpers";

// ── Projectteam ──────────────────────────────────────────────────────

function TeamBlock({ team }: { team: ProjectDetail["team"] }) {
  const { t } = useTranslation();
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 mb-3">{t("sidebar.team")}</h3>
      {team.length === 0 ? (
        <p className="text-sm text-slate-400">{t("sidebar.team_empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {team.map((member) => (
            <div key={member.user} className="flex items-center gap-2.5 min-w-0">
              <Avatar name={member.fullName} size="md" />
              <div className="min-w-0">
                <p className="text-sm text-slate-700 truncate leading-tight">{member.fullName}</p>
                {member.role && (
                  <p className="text-xs text-slate-400 capitalize truncate leading-tight mt-0.5">
                    {member.role}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Opdrachtgever ────────────────────────────────────────────────────

function OpdrachtgeverBlock({ customerName, customerAddress }: {
  customerName: string;
  customerAddress: string | null;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 mb-3">{t("sidebar.client")}</h3>
      <p className="text-sm font-medium text-slate-700">{customerName}</p>
      {customerAddress && (
        <p className="text-xs text-slate-500 mt-1 leading-snug">{customerAddress}</p>
      )}
    </div>
  );
}

// ── Contract ─────────────────────────────────────────────────────────

function ContractRow({ label, value, valueClass = "text-slate-700" }: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={`text-xs font-medium tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function ContractBlock({ financials }: { financials: ProjectFinancials | null }) {
  const { t } = useTranslation();
  if (!financials) return null;

  const { aanneemsom, meerwerk, gefactureerd, openstaand } = financials;
  const openstaandFmt = openstaand < 0
    ? `−${fmtEuro(Math.abs(openstaand))}`
    : fmtEuro(openstaand);
  const openstaandColor = openstaand < 0 ? "text-amber-600" : "text-slate-700";

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 mb-3">{t("sidebar.contract")}</h3>
      <div className="flex flex-col gap-1.5">
        <ContractRow label={t("sidebar.contract_aanneemsom")} value={fmtEuro(aanneemsom)} />
        <ContractRow
          label={t("sidebar.contract_meerwerk")}
          value={meerwerk === 0 ? "—" : fmtEuro(meerwerk)}
        />
        <ContractRow label={t("sidebar.contract_gefactureerd")} value={fmtEuro(gefactureerd)} />
        <ContractRow
          label={t("sidebar.contract_openstaand")}
          value={openstaandFmt}
          valueClass={openstaandColor}
        />
      </div>
    </div>
  );
}

// ── Labels ───────────────────────────────────────────────────────────

function LabelsBlock({ werksoort }: { werksoort: ProjectDetail["werksoort"] }) {
  const { t } = useTranslation();
  if (!werksoort) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 mb-3">{t("sidebar.labels")}</h3>
      <WerksoortBadge werksoort={werksoort} />
    </div>
  );
}

// ── Sidebar container ─────────────────────────────────────────────────

interface SidebarProps {
  detail: ProjectDetail;
  financials: ProjectFinancials | null;
}

export function Sidebar({ detail, financials }: SidebarProps) {
  return (
    <div className="flex flex-col gap-6">
      <TeamBlock team={detail.team} />
      <OpdrachtgeverBlock
        customerName={detail.customerName}
        customerAddress={detail.customerAddress}
      />
      <ContractBlock financials={financials} />
      <LabelsBlock werksoort={detail.werksoort} />
    </div>
  );
}
