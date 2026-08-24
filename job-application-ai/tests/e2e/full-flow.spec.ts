import { test, expect } from '@playwright/test';
import { createJobViaApi, deleteJobViaApi, unique, waitForApiJson } from './helpers';

/**
 * Canonical end-to-end flow (the app's definition of done):
 * create job -> analyze JD -> generate resume -> version stored -> PDF view/download
 * -> job reflects scores -> company resume appears in the library.
 *
 * generate-resume runs a multi-iteration optimization + PDF render, which can
 * take a couple of minutes, so this test is intentionally long-running.
 */

const BASE = process.env.WEB_URL ?? 'http://localhost:5173';

// A rich JD that the AI can extract requirements from, matching the active
// master resume's content (TypeScript/React/etc.) so scores are meaningful.
const JD =
  'Acme is hiring a Senior Software Engineer to own core TypeScript and React applications. ' +
  'You will design REST APIs on Node.js, work with PostgreSQL, and ship automated tests in a ' +
  'continuous integration pipeline. Responsibilities: build scalable web applications, lead a ' +
  'cross-functional team, enforce code quality and testing standards. Required skills: ' +
  'TypeScript, React, Node.js, PostgreSQL, CI/CD, automated testing, JavaScript. ' +
  'Preferred: AWS, Docker, GraphQL. We value strong communication and ownership.';

test.describe('End-to-end AI resume flow', () => {
  const cleanupCompanies: string[] = [];

  test.afterEach(async ({ request }) => {
    // Delete any jobs created by this suite (even if a test timed out).
    const res = await request.get(`${BASE}/api/jobs`);
    const jobs = (await res.json()).data ?? [];
    for (const job of jobs) {
      if (cleanupCompanies.some((c) => job.company.startsWith(c))) {
        await request.delete(`${BASE}/api/jobs/${job.id}`).catch(() => {});
      }
    }
    cleanupCompanies.length = 0;
  });

  test('Create -> analyze -> generate -> version -> PDF preview & download', async ({
    page,
    request,
  }) => {
    test.setTimeout(420_000);

    const company = unique('E2EAcme');
    cleanupCompanies.push(company);
    const job = await createJobViaApi(request, BASE, {
      company,
      title: 'Senior Software Engineer',
      description: JD,
      status: 'SAVED',
      priority: 'HIGH',
      location: 'San Francisco',
    });

    try {
      // 1. Open the job.
      await page.goto(`/jobs/${job.id}`);
      await expect(page.getByRole('heading', { name: company })).toBeVisible();

      // 2. Analyze JD (slow AI). Verify extracted required skills.
      const [analysis] = await Promise.all([
        waitForApiJson(page, (u) => u.includes(`/api/jobs/${job.id}/analyze`) && !u.includes('analyze-resume'), {
          method: 'POST',
          timeout: 150_000,
        }),
        page.getByRole('button', { name: 'Analyze JD' }).click(),
      ]);
      expect(analysis.data?.requiredSkills.length).toBeGreaterThan(0);
      await expect(page.getByText('JD analysis completed', { exact: true })).toBeVisible();

      // 3. Generate resume (slowest). Verify a version is returned with a score.
      const [generated] = await Promise.all([
        waitForApiJson(page, (u) => u.includes(`/api/jobs/${job.id}/generate-resume`), {
          method: 'POST',
          timeout: 300_000,
        }),
        page.getByRole('button', { name: 'Generate Resume' }).first().click(),
      ]);
      const version = generated.data;
      expect(version.versionNumber).toBeGreaterThanOrEqual(1);
      expect(typeof version.score).toBe('number');
      await expect(page.getByText('Resume generated', { exact: true })).toBeVisible();

      // 4. Versions tab lists the generated version.
      await page.getByRole('button', { name: 'Versions', exact: true }).click();
      const versionCard = page.getByText(`Version ${version.versionNumber}`, { exact: true }).first();
      await expect(versionCard).toBeVisible();
      await expect(page.getByText('Current', { exact: true }).first()).toBeVisible();

      // 5. PDF preview: the UI modal opens with an embedded PDF iframe, and the
      //    preview endpoint genuinely serves a PDF for the generated version.
      //    (Exact-name match so we don't hit the "Overview" tab, which contains
      //    the substring "View".)
      await page.getByRole('button', { name: 'View', exact: true }).first().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 20_000 });
      await expect(dialog.getByText('Resume Details', { exact: true })).toBeVisible();
      await expect(dialog.locator('iframe')).toBeAttached();

      const previewRes = await request.get(`${BASE}/api/resume-versions/${version.id}/preview`);
      expect(previewRes.status()).toBe(200);
      expect((previewRes.headers()['content-type'] ?? '').toLowerCase()).toContain('application/pdf');
      expect((await previewRes.body()).length).toBeGreaterThan(100);

      // Close preview.
      await dialog.getByRole('button', { name: 'Close dialog' }).click();
      await expect(dialog).toBeHidden({ timeout: 15_000 });

      // 6. PDF download and the download endpoint return a real PDF document.
      const [dlResp] = await Promise.all([
        page.waitForResponse((r) => r.url().includes(`/api/resume-versions/${version.id}/download`) && r.ok()),
        page.getByRole('button', { name: 'Download', exact: true }).first().click(),
      ]);
      expect((dlResp.headers()['content-type'] ?? '').toLowerCase()).toContain('application/pdf');

      const dlBody = await request.get(`${BASE}/api/resume-versions/${version.id}/download`);
      expect(dlBody.status()).toBe(200);
      expect((await dlBody.body()).length).toBeGreaterThan(100);

      // 7. The job's Overview reflects the generated score.
      await page.getByRole('button', { name: 'Overview', exact: true }).click();
      await expect(page.getByText(`${version.score} / 100`).first()).toBeVisible();

      // 8. The company resume appears in the Resume Library.
      await page.goto('/resume');
      await expect(page.getByRole('heading', { name: 'Master Resume and company-specific versions' })).toBeVisible();
      await expect(page.getByText(company, { exact: true }).first()).toBeVisible();

      // 9. The Dashboard Recent Jobs lists the job with its score.
      await page.goto('/');
      await expect(page.getByText('Application command center')).toBeVisible();
      await expect(page.getByText('Total Jobs')).toBeVisible();
      await expect(page.getByText(company, { exact: true }).first()).toBeVisible();
    } finally {
      await deleteJobViaApi(request, BASE, job.id).catch(() => {});
    }
  });
});