import { motion } from "framer-motion";
import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div role="tablist" aria-label="Result views" className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface p-1">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none ${
              isActive ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="result-tab-pill"
                className="absolute inset-0 rounded-lg border border-line-strong bg-elevated"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
