import { AnimatePresence, motion } from "framer-motion";
import {
  AlignLeft,
  Box,
  ChevronDown,
  ChevronsUpDown,
  CircleDot,
  LayoutPanelTop,
  Link2,
  List,
  MousePointerClick,
  Tag,
  TextCursorInput,
} from "lucide-react";
import { useState } from "react";
import type { ElementAnalysis } from "../../types/locator";
import { Badge } from "../common/Badge";
import { CopyButton } from "../common/CopyButton";
import { StabilityScore } from "../analysis/StabilityScore";

function iconForTag(tag: string) {
  switch (tag.toLowerCase()) {
    case "button":
      return MousePointerClick;
    case "input":
      return TextCursorInput;
    case "a":
      return Link2;
    case "select":
      return ChevronsUpDown;
    case "option":
      return List;
    case "textarea":
      return AlignLeft;
    case "form":
      return LayoutPanelTop;
    case "label":
      return Tag;
    case "summary":
    case "details":
      return CircleDot;
    default:
      return Box;
  }
}

function toneForScore(score: number): "success" | "accent" | "warning" | "danger" {
  if (score >= 90) return "success";
  if (score >= 75) return "accent";
  if (score >= 50) return "warning";
  return "danger";
}

interface LocatorCardProps {
  element: ElementAnalysis;
  index: number;
  defaultExpanded?: boolean;
}

export function LocatorCard({ element, index, defaultExpanded = false }: LocatorCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const Icon = iconForTag(element.tag);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.3, ease: "easeOut" }}
      className="rounded-2xl border border-line bg-surface/70 backdrop-blur transition-colors hover:border-line-strong"
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-elevated text-muted">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-ink">
                {element.element}
                <span className="ml-2 text-xs font-normal text-faint">#{index + 1}</span>
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge tone="neutral">{element.tag}</Badge>
                <Badge tone={toneForScore(element.primary.score)}>{element.primary.strategy}</Badge>
              </div>
            </div>
          </div>
          <Badge tone={element.primary.score >= 75 ? "primary" : "warning"}>Recommended</Badge>
        </div>

        <div className="flex flex-col gap-2.5">
          <StabilityScore score={element.primary.score} />
          <div className="flex items-start gap-2 rounded-xl border border-line bg-editor px-3 py-2.5">
            <code className="mono flex-1 overflow-x-auto whitespace-pre text-[12.5px] leading-relaxed text-ink">
              {element.primary.locator}
            </code>
            <CopyButton text={element.primary.locator} label="" className="shrink-0 border-0 bg-transparent px-1.5" />
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted">
          <span className="font-medium text-ink">Why:</span> {element.primary.reason ?? "Chosen for stability and uniqueness."}
        </p>

        {element.fallbacks.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="flex items-center gap-1.5 self-start text-xs font-medium text-muted transition-colors hover:text-ink"
          >
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.span>
            Alternatives · {element.fallbacks.length}
          </button>
        )}

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <ol className="flex flex-col gap-2 border-l border-line pl-3">
                {element.fallbacks.map((fallback, i) => (
                  <li key={i} className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-faint">
                        Alternative {i + 1} · {fallback.strategy}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted">{fallback.score}/100</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <code className="mono flex-1 overflow-x-auto whitespace-pre text-[12px] leading-relaxed text-ink">
                        {fallback.locator}
                      </code>
                      <CopyButton text={fallback.locator} label="" className="shrink-0 border-0 bg-transparent px-1.5" />
                    </div>
                    {fallback.reason && <p className="text-[11px] leading-relaxed text-faint">{fallback.reason}</p>}
                  </li>
                ))}
              </ol>
            </motion.div>
          )}
        </AnimatePresence>

        {element.risks.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {element.risks.map((risk, i) => (
              <Badge key={i} tone="warning">
                {risk}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </motion.article>
  );
}
