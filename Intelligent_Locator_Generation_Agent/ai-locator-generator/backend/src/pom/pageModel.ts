import type { ProcessedElement } from "../dom/domProcessor.js";

export interface GeneratedOwner {
  type: "page" | "component" | "tab";
  name: string;
  filename: string;
  /** Owning page for components and tabs. */
  pageName?: string;
  elements: ProcessedElement[];
}

export interface PageModel {
  owners: GeneratedOwner[];
}

const MIN_COMPONENT_ELEMENTS = 2;
const MIN_PAGE_ELEMENTS = 3;
const MIN_TAB_CLASS_ELEMENTS = 4;

function pascalCase(value: string): string {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "Section";
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

function pageNameFromUrl(url: string | undefined): string {
  if (!url) return "MainPage";
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "") || "/";
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return "MainPage";
    const name = segments[0];
    return `${pascalCase(name)}Page`;
  } catch {
    return "MainPage";
  }
}

function cardNameFromClass(signature: string): string {
  const tokens = signature.split(/\s+/).filter((t) => /^[a-zA-Z]/.test(t));
  const name = pascalCase(tokens[0] ?? "Item");
  return name.endsWith("Card") ? name : `${name}Card`;
}

/**
 * Infer a page/component/tab ownership model from DOM structure. Heuristics:
 * - forms become pages (named from the form or the URL)
 * - nav/header/footer become components
 * - repeated identical class signatures become card components
 * - tablist panels become tab classes when substantial, otherwise stay on the page
 * - named sections become pages when large, components when small
 * - everything else lands on the main page
 */
export function buildPageModel(elements: ProcessedElement[], pageUrl?: string, language?: string): PageModel {
  const owners: GeneratedOwner[] = [];
  const unassigned = new Set(elements.map((el) => el.elementId));

  const take = (ids: string[]): ProcessedElement[] => {
    const taken: ProcessedElement[] = [];
    for (const id of ids) {
      if (unassigned.has(id)) {
        const el = elements.find((e) => e.elementId === id);
        if (el) taken.push(el);
        unassigned.delete(id);
      }
    }
    return taken;
  };

  const filenameFor = (name: string): string => {
    const ext = language === "python" ? ".py" : language === "java" ? ".java" : language === "csharp" ? ".cs" : ".ts";
    return `${name}${ext}`;
  };

  const pushOwner = (owner: GeneratedOwner) => {
    if (owner.elements.length > 0) owners.push(owner);
  };

  const defaultPageName = pageNameFromUrl(pageUrl);

  // 1. Tablist panels -> tab classes (or keep on page).
  const tablistElements = elements.filter((el) => el.context.container === "tablist");
  const tabGroups = new Map<string, ProcessedElement[]>();
  for (const el of tablistElements) {
    const key = el.context.section || "__default__";
    if (!tabGroups.has(key)) tabGroups.set(key, []);
    tabGroups.get(key)!.push(el);
  }
  for (const [section, group] of tabGroups) {
    const taken = take(group.map((el) => el.elementId));
    if (taken.length >= MIN_TAB_CLASS_ELEMENTS) {
      pushOwner({
        type: "tab",
        name: `${pascalCase(section === "__default__" ? "Details" : section)}Tab`,
        filename: filenameFor(`${pascalCase(section === "__default__" ? "Details" : section)}Tab`),
        pageName: defaultPageName,
        elements: taken,
      });
    } else {
      // Simple tabs remain methods on the owning page: restore to unassigned pool.
      for (const el of taken) unassigned.add(el.elementId);
    }
  }

  // 2. Repeated class signatures -> card components.
  const bySignature = new Map<string, ProcessedElement[]>();
  for (const el of elements) {
    if (!unassigned.has(el.elementId)) continue;
    const sig = el.context.repeatedClass;
    if (!sig || sig.split(/\s+/).length === 1) continue;
    if (!bySignature.has(sig)) bySignature.set(sig, []);
    bySignature.get(sig)!.push(el);
  }
  for (const [signature, group] of bySignature) {
    if (group.length < 3) continue;
    const taken = take(group.map((el) => el.elementId));
    if (taken.length > 0) {
      pushOwner({
        type: "component",
        name: cardNameFromClass(signature),
        filename: filenameFor(cardNameFromClass(signature)),
        pageName: defaultPageName,
        elements: taken,
      });
    }
  }

  // 3. Forms -> pages.
  const byForm = new Map<string, ProcessedElement[]>();
  for (const el of elements) {
    if (!unassigned.has(el.elementId)) continue;
    const form = el.context.form;
    if (form === undefined) continue;
    const key = form || "__anonymous__";
    if (!byForm.has(key)) byForm.set(key, []);
    byForm.get(key)!.push(el);
  }
  const formEntries = [...byForm.entries()];
  for (let i = 0; i < formEntries.length; i++) {
    const [form, group] = formEntries[i];
    const taken = take(group.map((el) => el.elementId));
    if (taken.length === 0) continue;
    const baseName =
      form !== "__anonymous__" && form
        ? pascalCase(form)
        : formEntries.length === 1
          ? defaultPageName.replace(/Page$/, "")
          : `Form${i + 1}`;
    pushOwner({
      type: "page",
      name: `${baseName}Page`,
      filename: filenameFor(`${baseName}Page`),
      elements: taken,
    });
  }

  // 4. Nav / header / footer -> components.
  for (const container of ["nav", "header", "footer"] as const) {
    const group = elements.filter((el) => unassigned.has(el.elementId) && el.context.container === container);
    const taken = take(group.map((el) => el.elementId));
    if (taken.length >= MIN_COMPONENT_ELEMENTS) {
      const name = container === "nav" ? "Navigation" : pascalCase(container);
      pushOwner({
        type: "component",
        name,
        filename: filenameFor(name),
        pageName: defaultPageName,
        elements: taken,
      });
    } else {
      for (const el of taken) unassigned.add(el.elementId);
    }
  }

  // 5. Named sections -> pages when large, components when small.
  const bySection = new Map<string, ProcessedElement[]>();
  for (const el of elements) {
    if (!unassigned.has(el.elementId)) continue;
    const section = el.context.section;
    if (!section) continue;
    if (!bySection.has(section)) bySection.set(section, []);
    bySection.get(section)!.push(el);
  }
  for (const [section, group] of bySection) {
    const taken = take(group.map((el) => el.elementId));
    if (taken.length === 0) continue;
    const name = pascalCase(section);
    if (taken.length >= MIN_PAGE_ELEMENTS) {
      pushOwner({ type: "page", name: `${name}Page`, filename: filenameFor(`${name}Page`), elements: taken });
    } else {
      pushOwner({
        type: "component",
        name,
        filename: filenameFor(name),
        pageName: defaultPageName,
        elements: taken,
      });
    }
  }

  // 6. Everything else -> main page.
  const leftovers = take([...unassigned]);
  if (leftovers.length > 0) {
    pushOwner({
      type: "page",
      name: defaultPageName,
      filename: filenameFor(defaultPageName),
      elements: leftovers,
    });
  }

  return { owners };
}
