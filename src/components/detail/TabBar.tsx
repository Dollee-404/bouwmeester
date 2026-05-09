import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export const TAB_KEYS = [
  "overzicht",
  "planning",
  "calculatie",
  "financieel",
  "uren",
  "materialen",
  "documenten",
  "opleverpunten",
] as const;

export type TabKey = (typeof TAB_KEYS)[number];

interface TabBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const { t } = useTranslation();
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeTab]);

  return (
    <div className="border-b border-slate-200">
      <div className="flex overflow-x-auto scrollbar-hide px-6">
        {TAB_KEYS.map((key) => {
          const isActive = key === activeTab;
          return (
            <button
              key={key}
              ref={isActive ? activeRef : null}
              onClick={() => onTabChange(key)}
              className={[
                "shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap",
                "border-b-2 -mb-px",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal rounded-t",
                isActive
                  ? "text-y-teal border-y-teal"
                  : "text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300",
              ].join(" ")}
            >
              {t(`tab.${key}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
