import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CopyButton } from "../common/CopyButton";

interface JsonViewerProps {
  data: unknown;
}

function JsonValue({ value, depth }: { value: unknown; depth: number }): ReactNode {
  if (value === null) return <span className="text-warning">null</span>;
  if (typeof value === "boolean") return <span className="text-warning">{String(value)}</span>;
  if (typeof value === "number") return <span className="text-accent">{value}</span>;
  if (typeof value === "string") return <span className="text-success">"{value}"</span>;
  return <JsonNode value={value as Record<string, unknown> | unknown[]} depth={depth} />;
}

function JsonNode({ value, depth }: { value: Record<string, unknown> | unknown[]; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const isArray = Array.isArray(value);
  const entries = isArray ? value.map((v, i) => [String(i), v] as const) : Object.entries(value);
  const bracket = isArray ? ["[", "]"] : ["{", "}"];

  return (
    <span className="block">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded px-0.5 text-left hover:bg-hover"
      >
        <span className="text-faint">{open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>
        <span className="text-muted">{bracket[0]}</span>
        {!open && <span className="text-faint">…{entries.length} {entries.length === 1 ? "item" : "items"}</span>}
      </button>
      {open ? (
        <span className="block border-l border-line pl-3" style={{ marginLeft: 4 }}>
          {entries.map(([key, val]) => (
            <span key={key} className="block leading-6">
              <span className="text-primary">{isArray ? key : `"${key}"`}</span>
              <span className="text-faint">: </span>
              <JsonValue value={val} depth={depth + 1} />
              <span className="text-faint">,</span>
            </span>
          ))}
        </span>
      ) : null}
      {open && <span className="text-muted">{bracket[1]}</span>}
    </span>
  );
}

export function JsonViewer({ data }: JsonViewerProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-editor">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="mono text-[11px] font-medium text-muted">response.json</span>
        <CopyButton text={JSON.stringify(data, null, 2)} />
      </div>
      <div className="mono max-h-[560px] overflow-auto px-3 py-3 text-[12.5px] leading-6">
        <JsonValue value={data} depth={0} />
      </div>
    </div>
  );
}
