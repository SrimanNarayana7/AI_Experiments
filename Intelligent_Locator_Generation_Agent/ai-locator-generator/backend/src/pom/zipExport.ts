import AdmZip from "adm-zip";
import type { GeneratedFile } from "./projectGenerator.js";

/** Strip path separators, traversal, and anything outside a safe filename set. */
export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/\\/g, "/").replace(/\.\./g, "");
  return cleaned
    .split("/")
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^-+|-+$/g, ""))
    .filter((segment) => segment.length > 0)
    .join("/");
}

export function buildProjectZip(files: GeneratedFile[], projectName = "ai-locator-project"): Buffer {
  const zip = new AdmZip();
  const seen = new Set<string>();
  for (const file of files) {
    const safe = sanitizeFileName(file.path);
    if (!safe || seen.has(safe)) continue;
    seen.add(safe);
    zip.addFile(`${projectName}/${safe}`, Buffer.from(file.content, "utf-8"));
  }
  return zip.toBuffer();
}
