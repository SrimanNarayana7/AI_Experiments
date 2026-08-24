import { APIRequestContext, Page, expect } from '@playwright/test';

/**
 * Shared helpers for the Job Application AI Copilot E2E suite.
 */

/** Run-scoped unique suffix so parallel/re-run data does not collide. */
export function unique(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 5);
  return `${prefix}-${ts}${rand}`;
}

/** The app lives at /api/* on the same origin as the frontend (Vite proxy). */
const API_BASE = '/api';

/**
 * Returns an APIRequestContext bound to the same origin/port as the web app.
 * The backend is reached through the Vite proxy so CORS/paths match the UI.
 */
export async function apiRequest(request: APIRequestContext, baseUrl: string) {
  return request;
}

async function callApi(
  request: APIRequestContext,
  baseUrl: string,
  method: string,
  path: string,
  body?: unknown,
) {
  const res = await request[method as 'get' | 'post' | 'put' | 'patch' | 'delete'](
    `${baseUrl}${API_BASE}${path}`,
    { data: body },
  );
  return res;
}

/** Create a job directly via the API (used to set up a known state). */
export async function createJobViaApi(
  request: APIRequestContext,
  baseUrl: string,
  data: Record<string, unknown>,
) {
  const res = await callApi(request, baseUrl, 'post', '/jobs', data);
  expect(res.ok(), `create job via api: ${res.status()} ${await res.text()}`).toBeTruthy();
  const json = await res.json();
  return json.data;
}

/** Delete a job by id via the API. */
export async function deleteJobViaApi(
  request: APIRequestContext,
  baseUrl: string,
  jobId: string,
) {
  const res = await callApi(request, baseUrl, 'delete', `/jobs/${jobId}`);
  expect(res.ok()).toBeTruthy();
}

/** Get the list of jobs via the API. */
export async function listJobsViaApi(request: APIRequestContext, baseUrl: string) {
  const res = await request.get(`${baseUrl}/api/jobs`);
  const json = await res.json();
  return json.data ?? [];
}

/**
 * ErrorCollector attaches to a page and collects browser console errors and
 * failed / non-2xx API requests so tests can assert a clean run.
 */
export class ErrorCollector {
  private consoleErrors: string[] = [];
  private failedRequests: Array<{ url: string; status: number; method: string }> = [];
  private attached = false;

  attach(page: Page) {
    if (this.attached) return;
    this.attached = true;
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      this.consoleErrors.push(`pageerror: ${err.message}`);
    });
    page.on('response', (res) => {
      if (res.status() >= 400) {
        this.failedRequests.push({
          url: res.url(),
          status: res.status(),
          method: res.request().method(),
        });
      }
    });
  }

  /** Filters out requests whose path is meaningful to the application. */
  interestingFailures(): Array<{ url: string; status: number; method: string }> {
    return this.failedRequests.filter((r) => !/\.(map|png|jpg|svg|woff2?|ttf)$/.test(r.url));
  }

  consoleErrorMessages(): string[] {
    return this.consoleErrors;
  }

  /** Asserts no console errors and no failed app API requests occurred. */
  assertClean() {
    const failures = this.interestingFailures();
    const consoleErrs = this.consoleErrors.filter((e) => {
      // Known benign warnings from the PDF viewer / axe are allowed only if obvious.
      return e.includes('Failed to load resource') ? false : true;
    });
    expect(failures, `failed API requests: ${JSON.stringify(failures)}`).toEqual([]);
    expect(consoleErrs, `console errors: ${JSON.stringify(consoleErrs)}`).toEqual([]);
  }
}

/** Await a specific API response and return its JSON body. */
export async function waitForApiJson(
  page: Page,
  predicate: (url: string, opts?: { method?: string }) => boolean,
  opts?: { method?: string; timeout?: number },
) {
  const res = await page.waitForResponse(
    (response) => {
      const matchesMethod = opts?.method
        ? response.request().method() === opts.method
        : true;
      return matchesMethod && predicate(response.url());
    },
    { timeout: opts?.timeout ?? 180_000 },
  );
  return res.json();
}