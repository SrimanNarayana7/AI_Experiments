import { useRef, useState } from "react";
import { CopyButton } from "../common/CopyButton";

interface CodeViewerProps {
  code: string;
  filename?: string;
  label?: string;
  maxCollapsedHeight?: number;
  stickyHeader?: boolean;
}

export function CodeViewer({ code, filename, label, maxCollapsedHeight = 420, stickyHeader = false }: CodeViewerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLPreElement>(null);
  const lines = code.split("\n");
  const tall = lines.length > 24;

  const header = (
    <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex gap-1" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-danger/60" />
          <span className="h-2 w-2 rounded-full bg-warning/60" />
          <span className="h-2 w-2 rounded-full bg-success/60" />
        </span>
        <span className="mono truncate text-[11px] font-medium text-muted">{filename ?? label ?? "code"}</span>
      </div>
      <CopyButton text={code} />
    </div>
  );

  const body = (
    <div className="flex">
      <div aria-hidden="true" className="mono w-10 shrink-0 select-none overflow-hidden py-3 pr-2 text-right text-[12px] leading-6 text-faint">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <pre
        ref={scrollRef}
        className="mono flex-1 overflow-x-auto px-3 py-3 text-[12.5px] leading-6 text-ink"
        style={{ maxHeight: collapsed && tall ? maxCollapsedHeight : undefined }}
      >
        {code}
      </pre>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-editor">
      {stickyHeader ? <div className="sticky top-0 z-10 bg-editor/95 backdrop-blur">{header}</div> : header}
      {body}
      {tall && (
        <div className="flex items-center justify-center border-t border-line p-2">
          <button
            onClick={() => {
              setCollapsed(!collapsed);
              if (collapsed) {
                requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }));
              }
            }}
            className="text-[11px] font-medium text-muted transition-colors hover:text-ink"
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      )}
    </div>
  );
}
