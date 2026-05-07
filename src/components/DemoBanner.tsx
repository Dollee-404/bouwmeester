import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { INSTANCE_ID } from "../bridge";

export function DemoBanner() {
  const { t } = useTranslation();

  if (INSTANCE_ID) return null;

  return (
    <div className="w-full border-b border-amber-200 bg-amber-50 px-4 py-2">
      <p className="flex items-center gap-2 text-sm text-amber-900">
        <Info size={16} aria-hidden="true" className="shrink-0" />
        {t("demo.banner.message")}{" "}
        <a
          href="https://github.com/Dollee-404/bouwmeester#readme"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-amber-700"
        >
          {t("demo.banner.cta")}
        </a>
      </p>
    </div>
  );
}
