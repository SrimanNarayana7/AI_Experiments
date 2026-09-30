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

/** Structural context captured per element, used for batching and page/component/tab ownership. */
export interface ElementContext {
  form?: string;
  section?: string;
  container?: "nav" | "header" | "footer" | "tablist";
  repeatedClass?: string;
}

export interface ProcessedElement {
  index: number;
  elementId: string;
  tag: string;
  attributes: Record<string, string>;
  text: string;
  context: ElementContext;
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

const HEADING_ANCHOR = /^(h1|h2|h3|h4)$/;

function captureContext($el: any, $: any): ElementContext {
  const context: ElementContext = {};
  const form = $el.parents("form").first();
  if (form.length > 0) {
    context.form = form.attr("id") || form.attr("name") || form.attr("aria-label") || "";
  }
  const nav = $el.parents("nav").first();
  const header = $el.parents("header").first();
  const footer = $el.parents("footer").first();
  const tablist = $el.parents('[role="tablist"]').first();
  if (nav.length > 0) context.container = "nav";
  else if (header.length > 0) context.container = "header";
  else if (footer.length > 0) context.container = "footer";
  else if (tablist.length > 0) context.container = "tablist";

  const section = $el
    .parents()
    .toArray()
    .map((p: any) => $(p))
    .find((p: any) => {
      const ariaLabel = p.attr("aria-label");
      if (ariaLabel) return true;
      const role = p.attr("role");
      if (role && !["presentation", "group"].includes(role)) return true;
      const firstHeading = p.children().first();
      return firstHeading.length > 0 && HEADING_ANCHOR.test((firstHeading[0] as any).tagName ?? "");
    });
  if (section) {
    context.section =
      section.attr("aria-label") ||
      section.attr("role") ||
      section.children().first().text().replace(/\s+/g, " ").trim().slice(0, 80) ||
      "";
  }

  const cls = ($el.attr("class") ?? "").trim();
  if (cls) context.repeatedClass = cls.split(/\s+/).sort().join(" ");

  return context;
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
  let counter = 0;

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
      elementId: `el-${String(counter).padStart(4, "0")}`,
      tag: (this.tagName ?? "").toLowerCase(),
      attributes,
      text: visibleText($(this), $),
      context: captureContext($(this), $),
    });
    counter++;
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
