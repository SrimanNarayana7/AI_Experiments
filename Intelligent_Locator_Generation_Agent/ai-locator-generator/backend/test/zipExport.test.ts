import AdmZip from "adm-zip";
import { describe, expect, it } from "vitest";
import { buildProjectZip, sanitizeFileName } from "../src/pom/zipExport.js";

describe("sanitizeFileName", () => {
  it("blocks path traversal", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("etc/passwd");
    expect(sanitizeFileName("a/../../../b")).toBe("a/b");
  });

  it("strips separators and weird characters", () => {
    expect(sanitizeFileName("src\\pages\\Login Page!.ts")).toBe("src/pages/Login-Page-.ts");
  });

  it("returns empty for empty segments", () => {
    expect(sanitizeFileName("///")).toBe("");
  });
});

describe("buildProjectZip", () => {
  it("packages files under the project root without traversal", () => {
    const buffer = buildProjectZip([
      { path: "README.md", content: "# hi", kind: "readme" },
      { path: "src/pages/LoginPage.ts", content: "export class LoginPage {}", kind: "page" },
      { path: "../../evil.sh", content: "bad", kind: "config" },
    ]);
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries().map((e) => e.entryName);
    expect(entries).toContain("ai-locator-project/README.md");
    expect(entries).toContain("ai-locator-project/src/pages/LoginPage.ts");
    expect(entries.some((e) => e.includes(".."))).toBe(false);
    expect(zip.readAsText("ai-locator-project/src/pages/LoginPage.ts")).toContain("LoginPage");
  });
});
