import { motion } from "framer-motion";
import { Boxes, Gauge, ShieldCheck } from "lucide-react";
import type { AnalysisSummary } from "../../types/locator";

interface AnalysisSummaryProps {
  summary: AnalysisSummary;
  elapsedMs: number | null;
}

export function AnalysisSummary({ summary, elapsedMs }: AnalysisSummaryProps) {
  const items = [
    {
      icon: <Boxes className="h-4 w-4" />,
      label: "Elements",
      value: summary.elementsAnalyzed,
      hint: "interactive elements",
      accent: "text-primary",
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "Stable",
      value: summary.highConfidence,
      hint: "score ≥ 80",
      accent: "text-success",
    },
    {
      icon: <Gauge className="h-4 w-4" />,
      label: "Stability",
      value: `${Math.round(summary.avgScore)}/100`,
      hint: "average score",
      accent: "text-accent",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.35, ease: "easeOut" }}
            className="rounded-2xl border border-line bg-surface/70 p-4 backdrop-blur"
          >
            <div className={`flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider ${item.accent}`}>
              {item.icon}
              {item.label}
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink">{item.value}</p>
            <p className="mt-0.5 text-[11px] text-faint">{item.hint}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/50 px-3 py-2">
        <span className="text-xs text-muted">
          {elapsedMs !== null ? (
            <>
              Analysis completed in <span className="font-semibold text-ink">{(elapsedMs / 1000).toFixed(1)}s</span>
            </>
          ) : (
            "Analysis complete"
          )}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, summary.avgScore))}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-violet-deep"
          />
        </div>
      </div>
    </div>
  );
}
