import * as cheerio from "cheerio";

export const INTERACTIVE_TAGS = new Set([
  "button",
  "input",
  "textarea",
  "select",
  "option",
  "a",
  "summary",
  "details",
]);

export const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "checkbox",
  "radio",
  "combobox",
  "listbox",
  "textbox",
  "searchbox",
  "menuitem",
  "tab",
  "switch",
  "slider",
  "option",
]);

const KEEP_ATTRIBUTES = new Set([
  "id",
  "name",
  "class",
  "role",
  "type",
  "placeholder",
  "value",
  "href",
  "title",
  "alt",
  "for",
  "checked",
  "disabled",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-expanded",
  "aria-haspopup",
  "aria-selected",
  "aria-checked",
  "data-testid",
  "data-test",
  "data-qa",
  "data-cy",
]);

export interface ProcessedElement {
  index: number;
  tag: string;
  attributes: Record<string, string>;
  text: string;
}

export interface ProcessedDom {
  elementCount: number;
  elements: ProcessedElement[];
  truncated: boolean;
  hadNoiseRemoved: boolean;
}

const INTERACTIVE_INPUT_TYPES = new Set([
  "button",
  "submit",
  "reset",
  "checkbox",
  "radio",
  "text",
  "email",
  "password",
  "search",
  "tel",
  "url",
  "number",
  "date",
  "file",
  "select",
]);

function isInteractive(node: any): boolean {
  const tag = (node.tagName ?? "").toLowerCase();
  if (tag === "input") {
    const type = (node.attribs?.type ?? "text").toLowerCase();
    return INTERACTIVE_INPUT_TYPES.has(type);
  }
  if (INTERACTIVE_TAGS.has(tag)) return true;
  const role = (node.attribs?.role ?? "").toLowerCase();
  return INTERACTIVE_ROLES.has(role);
}

function cleanAttributes(attribs: Record<string, string> | undefined): Record<string, string> {
  if (!attribs) return {};
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(attribs)) {
    const lower = key.toLowerCase();
    if (KEEP_ATTRIBUTES.has(lower) || lower.startsWith("data-") || lower.startsWith("aria-")) {
      cleaned[lower] = value.length > 200 ? value.slice(0, 200) : value;
    }
  }
  return cleaned;
}

function visibleText($node: any, $: any): string {
  const clone = $node.clone();
  clone.find("script, style, noscript").remove();
  return clone.text().replace(/\s+/g, " ").trim().slice(0, 200);
}

function resolveRole(attributes: Record<string, string>, tag: string): string {
  if (attributes.role) return attributes.role;
  if (tag === "button") return "button";
  if (tag === "a" && attributes.href) return "link";
  if (tag === "input") {
    const type = (attributes.type ?? "text").toLowerCase();
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    if (["text", "email", "password", "search", "tel", "url", "number", "date"].includes(type)) {
      return "textbox";
    }
    return "button";
  }
  if (tag === "select") return "combobox";
  if (tag === "textarea") return "textbox";
  return "";
}

/**
 * Extract interactive elements from HTML. Returns normalized metadata only —
 * the LLM never receives raw attribute values that are not in the original DOM.
 */
export function extractInteractiveElements(rawHtml: string, maxElements = 150): ProcessedDom {
  const $ = cheerio.load(rawHtml);

  let hadNoiseRemoved = false;
  $("script, style, noscript, template, svg, path, iframe, head").each(function (this: any) {
    hadNoiseRemoved = true;
    $(this).remove();
  });

  const elements: ProcessedElement[] = [];
  let truncated = false;

  $("*").each(function (this: any, index: number) {
    if (elements.length >= maxElements) {
      truncated = true;
      return false;
    }
    if (!isInteractive(this)) return;
    const attributes = cleanAttributes(this.attribs);
    const resolvedRole = resolveRole(attributes, (this.tagName ?? "").toLowerCase());
    if (resolvedRole) attributes.role = resolvedRole;
    elements.push({
      index,
      tag: (this.tagName ?? "").toLowerCase(),
      attributes,
      text: visibleText($(this), $),
    });
  });

  return { elementCount: elements.length, elements, truncated, hadNoiseRemoved };
}

export function renderElementList(dom: ProcessedDom): string {
  const lines = dom.elements.map((el) => {
    const attrs = Object.entries(el.attributes)
      .map(([k, v]) => `${k}="${v.replace(/"/g, "&quot;")}"`)
      .join(" ");
    return `[${el.index}] <${el.tag} ${attrs}>${el.text ? ` ${el.text}` : ""}`;
  });
  return lines.join("\n");
}
