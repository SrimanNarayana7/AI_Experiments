import { motion } from "framer-motion";
import type { ElementAnalysis } from "../../types/locator";

interface StabilityScoreProps {
  score: number;
  size?: "sm" | "md";
}

export function tierFor(score: number): { label: string; text: string; bar: string } {
  if (score >= 90) return { label: "Highly stable", text: "text-success", bar: "from-success to-accent" };
  if (score >= 75) return { label: "Stable", text: "text-accent", bar: "from-accent to-primary" };
  if (score >= 50) return { label: "Moderate", text: "text-warning", bar: "from-warning to-amber-400" };
  return { label: "Fragile", text: "text-danger", bar: "from-danger to-rose-400" };
}

export function StabilityScore({ score, size = "md" }: StabilityScoreProps) {
  const tier = tierFor(score);
  const width = size === "sm" ? "w-24" : "w-40";
  return (
    <div className={`flex flex-col gap-1 ${width}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-medium ${tier.text}`}>{tier.label}</span>
        <span className="text-[11px] font-semibold tabular-nums text-ink">{score}/100</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
          className={`h-full rounded-full bg-gradient-to-r ${tier.bar}`}
        />
      </div>
    </div>
  );
}

export function elementTier(score: number): "stable" | "moderate" | "fragile" {
  if (score >= 75) return "stable";
  if (score >= 50) return "moderate";
  return "fragile";
}

export function isTestAttributeStrategy(strategy: string): boolean {
  const s = strategy.toLowerCase();
  return s.includes("data-test") || s.includes("testid") || s.includes("test_id") || s.includes("data-qa") || s.includes("data-cy");
}

export function isStructuralStrategy(element: ElementAnalysis): boolean {
  const s = element.primary.strategy.toLowerCase();
  return s === "css" || s === "xpath";
}
