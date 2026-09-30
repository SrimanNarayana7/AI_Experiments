import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ElementAnalysis } from "../../types/locator";
import { isStructuralStrategy, isTestAttributeStrategy } from "./StabilityScore";

export type InsightFilter = "stable" | "structural" | "needsTestid";

export interface Insight {
  id: InsightFilter;
  icon: React.ReactNode;
  tone: "success" | "warning" | "info";
  title: string;
  count: number;
  filter: InsightFilter;
}

export function buildInsights(elements: ElementAnalysis[]): Insight[] {
  const stable = elements.filter((el) => el.primary.score >= 80);
  const structural = elements.filter(isStructuralStrategy);
  const needsTestid = elements.filter(
    (el) => !isTestAttributeStrategy(el.primary.strategy) && el.primary.score < 90,
  );

  const items: Insight[] = [
    {
      id: "stable",
      icon: <CircleCheck className="h-4 w-4" />,
      tone: "success",
      title: `${stable.length} ${stable.length === 1 ? "element has" : "elements have"} highly stable attributes`,
      count: stable.length,
      filter: "stable",
    },
    {
      id: "structural",
      icon: <CircleAlert className="h-4 w-4" />,
      tone: "warning",
      title: `${structural.length} ${structural.length === 1 ? "element relies" : "elements rely"} on structural selectors`,
      count: structural.length,
      filter: "structural",
    },
    {
      id: "needsTestid",
      icon: <Info className="h-4 w-4" />,
      tone: "info",
      title: `Consider adding data-testid to ${needsTestid.length} ${needsTestid.length === 1 ? "element" : "elements"}`,
      count: needsTestid.length,
      filter: "needsTestid",
    },
  ];
  return items.filter((insight) => insight.count > 0);
}

const TONES = {
  success: "text-success border-success/25 bg-success/5 hover:bg-success/10",
  warning: "text-warning border-warning/25 bg-warning/5 hover:bg-warning/10",
  info: "text-accent border-accent/25 bg-accent/5 hover:bg-accent/10",
};

interface InsightListProps {
  elements: ElementAnalysis[];
  activeFilter: InsightFilter | null;
  onFilter: (filter: InsightFilter | null) => void;
}

export function InsightList({ elements, activeFilter, onFilter }: InsightListProps) {
  const insights = buildInsights(elements);
  if (insights.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface/50 p-3 text-xs text-muted">
        No stability concerns detected.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {insights.map((insight) => {
        const active = activeFilter === insight.filter;
        return (
          <li key={insight.id}>
            <button
              onClick={() => onFilter(active ? null : insight.filter)}
              aria-pressed={active}
              className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                TONES[insight.tone]
              } ${active ? "ring-2 ring-inset ring-current/40" : ""}`}
            >
              {insight.icon}
              <span className="flex-1">{insight.title}</span>
              <span className="rounded-md bg-elevated px-1.5 py-0.5 text-[11px] tabular-nums text-ink">
                {insight.count}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
