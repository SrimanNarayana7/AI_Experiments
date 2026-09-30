import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);
const MAX_REDIRECTS = 3;
const MAX_BYTES = 600_000;

function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const parts = address.split(".").map(Number);
    if (parts[0] === 127) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 0 || parts[0] === 169) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    return false;
  }
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80");
}

export async function assertPublicHost(hostname: string): Promise<void> {
  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) {
    throw new UrlFetchError("Fetching localhost is not allowed.");
  }
  const addresses = await dns.lookup(hostname, { all: true });
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new UrlFetchError("Fetching private network addresses is not allowed.");
  }
}

export interface FetchedPage {
  html: string;
  note: string;
}

export async function fetchPageHtml(url: string): Promise<FetchedPage> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new UrlFetchError("Invalid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UrlFetchError("Only http and https URLs are supported.");
  }
  await assertPublicHost(parsed.hostname);

  let current = parsed.toString();
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "AI-Locator-Generator/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch (error) {
      clearTimeout(timer);
      if ((error as Error).name === "AbortError") throw new UrlFetchError("Timed out while fetching the page.");
      throw new UrlFetchError(`Failed to fetch page: ${(error as Error).message}`);
    }
    clearTimeout(timer);

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new UrlFetchError("Redirect without a location header.");
      current = new URL(location, parsed).toString();
      await assertPublicHost(new URL(current).hostname);
      continue;
    }
    if (!response.ok) {
      throw new UrlFetchError(`Page returned HTTP ${response.status}.`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new UrlFetchError(`Unsupported content type "${contentType}". Only HTML pages are supported.`);
    }
    const html = await response.text();
    if (html.length === 0) throw new UrlFetchError("Page returned an empty body.");
    return {
      html: html.slice(0, MAX_BYTES),
      note:
        "Static HTML fetched server-side. JavaScript-rendered content is not visible in this mode; use raw HTML/DOM input for SPA pages.",
    };
  }
  throw new UrlFetchError("Too many redirects.");
}

export class UrlFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlFetchError";
  }
}
