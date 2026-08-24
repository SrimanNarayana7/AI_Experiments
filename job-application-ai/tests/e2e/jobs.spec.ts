/**
 * Job Tracker (Kanban): create, search/filter, status movement, delete, detail nav.
 */

import { test, expect } from '@playwright/test';
import { createJobViaApi, deleteJobViaApi, unique, ErrorCollector } from './helpers';

const BASE = process.env.WEB_URL ?? 'http://localhost:5173';

/** The draggable JobCard element that contains a given company name. */
function jobCard(page: import('@playwright/test').Page, company: string) {
  return page.locator('[draggable="true"]').filter({ hasText: company }).first();
}

test.describe('Jobs', () => {
  let createdJobs: string[] = [];

  /** Create a job via API and register it for cleanup. */
  async function seed(request: import('@playwright/test').APIRequestContext, data: Record<string, unknown>) {
    const job = await createJobViaApi(request, BASE, data);
    createdJobs.push(job.id);
    return job;
  }

  test.afterEach(async ({ request }) => {
    for (const id of createdJobs) {
      await deleteJobViaApi(request, BASE, id).catch(() => {});
    }
    createdJobs = [];
  });

  test('Create job via form appears in the Backlog column', async ({ page, request }) => {
    const company = unique('Acme');
    const title = unique('DevOps Engineer');
    const collector = new ErrorCollector();
    collector.attach(page);

    await page.goto('/jobs');
    await expect(page.getByRole('heading', { name: 'Job Tracker' })).toBeVisible();
    await page.getByRole('button', { name: 'Add Job' }).first().click();

    const form = page.locator('form');
    await form.getByPlaceholder('Company').fill(company);
    await form.getByPlaceholder('Job title').fill(title);
    await form.getByPlaceholder('Location').fill('New York');
    await form.getByPlaceholder(/Paste the job description/).fill(
      'We build cloud infrastructure. Skills: Kubernetes, TypeScript, AWS.',
    );

    await form.getByRole('button', { name: 'Save Job' }).click();

    // The card appears in the Kanban Backlog column (waits on the refetch).
    const backlogCol = page.locator('section').filter({ hasText: 'Backlog' }).first();
    await expect(backlogCol.getByText(company)).toBeVisible({ timeout: 20_000 });
    // Form closes.
    await expect(page.locator('form')).toBeHidden();

    // Locate the created job id for cleanup.
    const res = await request.get(`${BASE}/api/jobs?search=${encodeURIComponent(company)}`);
    const list = (await res.json()).data ?? [];
    const created = list.find((j: { company: string }) => j.company === company);
    if (created) createdJobs.push(created.id);

    collector.assertClean();
  });

  test('Search filters jobs by company', async ({ page, request }) => {
    const target = unique('ZetaCorp');
    await seed(request, {
      company: target, title: 'QA Engineer',
      description: 'Testing pipeline. Skills: Playwright, TypeScript.',
      status: 'APPLIED', priority: 'MEDIUM',
    });
    await seed(request, {
      company: unique('OtherFirm'), title: 'Backend Dev',
      description: 'Backend infra. Skills: Java, SQL.',
      status: 'APPLIED', priority: 'LOW',
    });

    await page.goto('/jobs');
    await expect(page.getByRole('heading', { name: 'Job Tracker' })).toBeVisible();

    await page.getByPlaceholder('Search company, title, or JD...').fill(target);
    await expect.poll(() => page.getByText(target, { exact: true }).count()).toBeGreaterThan(0);
    await expect(page.getByText('OtherFirm', { exact: true })).toHaveCount(0);
  });

  test('Status filter shows only jobs in the selected status', async ({ page, request }) => {
    const savedJob = unique('SavedCo');
    const appliedJob = unique('AppliedCo');
    await seed(request, { company: savedJob, title: 'Saved Role', description: 'x', status: 'SAVED', priority: 'MEDIUM' });
    await seed(request, { company: appliedJob, title: 'Applied Role', description: 'y', status: 'APPLIED', priority: 'MEDIUM' });

    await page.goto('/jobs');
    await expect(page.getByRole('heading', { name: 'Job Tracker' })).toBeVisible();

    await page.locator('select').nth(0).selectOption('APPLIED');
    await expect(page.getByText(appliedJob, { exact: true })).toBeVisible();
    await expect(page.getByText(savedJob, { exact: true })).toHaveCount(0);
  });

  test('Priority filter shows only jobs with the selected priority', async ({ page, request }) => {
    const urgent = unique('UrgentCo');
    const normal = unique('NormalCo');
    await seed(request, { company: urgent, title: 'Urgent Role', description: 'z', status: 'BACKLOG', priority: 'URGENT' });
    await seed(request, { company: normal, title: 'Normal Role', description: 'w', status: 'BACKLOG', priority: 'LOW' });

    await page.goto('/jobs');
    await expect(page.getByRole('heading', { name: 'Job Tracker' })).toBeVisible();

    await page.locator('select').nth(1).selectOption('URGENT');
    await expect(page.getByText(urgent, { exact: true })).toBeVisible();
    await expect(page.getByText(normal, { exact: true })).toHaveCount(0);
  });

  test('Kanban drag-and-drop moves a job card into another column', async ({ page, request }) => {
    const company = unique('DraggableCo');
    await seed(request, {
      company, title: 'Drag Me', description: 'Draggable. Skills: TypeScript.',
      status: 'BACKLOG', priority: 'MEDIUM',
    });

    await page.goto('/jobs');
    await expect(page.getByRole('heading', { name: 'Job Tracker' })).toBeVisible();

    const savedCol = page.locator('section').filter({ hasText: 'Saved' }).first();
    const backlogCol = page.locator('section').filter({ hasText: 'Backlog' }).first();
    await expect(backlogCol.getByText(company, { exact: true })).toBeVisible();

    // Dispatch native HTML5 DnD events with a real DataTransfer so React's
    // onDragStart/onDrop handlers receive the jobId payload. The target column
    // is found by its <h3> heading, then the ancestor <section>.
    const moved = await page.evaluate(
      ({ companyText, targetHeading }) => {
        const heading = Array.from(document.querySelectorAll('h3')).find(
          (h) => h.textContent?.trim() === targetHeading,
        );
        const target = heading?.closest('section');
        const from = Array.from(document.querySelectorAll('[draggable="true"]')).find((c) =>
          c.textContent?.includes(companyText),
        ) as HTMLElement | undefined;
        if (!from || !target) return false;
        const dt = new DataTransfer();
        from.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
        target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
        target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
        return true;
      },
      { companyText: company, targetHeading: 'Saved' },
    );
    expect(moved).toBe(true);

    await expect(page.getByText('Job moved', { exact: true })).toBeVisible();
    await expect(savedCol.getByText(company, { exact: true })).toBeVisible();
    await expect(backlogCol.getByText(company, { exact: true })).toHaveCount(0);
  });

  test('Delete job via trash icon confirms and removes the card', async ({ page, request }) => {
    const company = unique('DoomedCo');
    await seed(request, {
      company, title: 'To Delete', description: 'Delete me. Skills: PHP.',
      status: 'BACKLOG', priority: 'LOW',
    });

    await page.goto('/jobs');
    await expect(page.getByRole('heading', { name: 'Job Tracker' })).toBeVisible();

    const card = jobCard(page, company);
    await expect(card).toBeVisible();
    await card.locator('button.text-destructive').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Delete Job?')).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete Job' }).click();

    await expect(page.getByText('Job deleted', { exact: true })).toBeVisible();
    await expect.poll(() => page.getByText(company, { exact: true }).count()).toBe(0);
  });

  test('Open a job card navigates to its details page', async ({ page, request }) => {
    const company = unique('DetailCo');
    await seed(request, {
      company, title: 'Detail Role', description: 'Click through. Skills: React.',
      status: 'SAVED', priority: 'MEDIUM',
    });

    await page.goto('/jobs');
    await expect(page.getByRole('heading', { name: 'Job Tracker' })).toBeVisible();

    const card = jobCard(page, company);
    await card.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByRole('heading', { name: company })).toBeVisible();
    await expect(page.getByText('Detail Role')).toBeVisible();
  });
});