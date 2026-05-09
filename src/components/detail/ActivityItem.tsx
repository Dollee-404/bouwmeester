import { MessageSquare, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ActivityItem as ActivityItemData } from "../../data/detail-types";

const MONTHS_NL = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
const MONTHS_EN = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

export function ActivityItem({ item }: { item: ActivityItemData }) {
  const { t, i18n } = useTranslation();
  const months = i18n.language.startsWith("en") ? MONTHS_EN : MONTHS_NL;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const d = new Date(item.createdAt.getFullYear(), item.createdAt.getMonth(), item.createdAt.getDate());

  let dateLabel: string;
  if (d.getTime() === today.getTime()) dateLabel = t("common.today");
  else if (d.getTime() === yesterday.getTime()) dateLabel = t("common.yesterday");
  else dateLabel = `${item.createdAt.getDate()} ${months[item.createdAt.getMonth()]}`;

  const timeStr = item.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const Icon = item.type === "comment" ? MessageSquare : FileText;

  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 last:border-b-0">
      <div className="mt-0.5 shrink-0 text-slate-400">
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 leading-snug">{item.description}</p>
        <p className="text-xs text-slate-400 mt-0.5">{dateLabel} · {timeStr}</p>
      </div>
    </div>
  );
}
