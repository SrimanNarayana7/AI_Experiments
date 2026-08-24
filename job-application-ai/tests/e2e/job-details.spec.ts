import { test, expect } from '@playwright/test';
import { createJobViaApi, deleteJobViaApi, unique, waitForApiJson } from './helpers';

/**
 * Job Details: overview, analysis, timeline, notes, move-status, and the
 * end-to-end JD analysis flow (slow AI-backed endpoint).
 */

const BASE = process.env.WEB_URL ?? 'http://localhost:5173';

const JD =
  'Senior Platform Engineer role. Build and operate Kubernetes clusters, AWS infrastructure, and ' +
  'TypeScript microservices. Skills: Kubernetes, AWS, TypeScript, Docker, CI/CD, Terraform. ' +
  'Responsibilities include infrastructure as code, observability, and incident response.';

test.describe('Job Details', () => {
  let createdJobs: string[] = [];

  test.afterEach(async ({ request }) => {
    for (const id of createdJobs) {
      await deleteJobViaApi(request, BASE, id).catch(() => {});
    }
    createdJobs = [];
  });

  test('Overview tab shows job info, JD, and action buttons', async ({ page, request }) => {
    const job = await createJobViaApi(request, BASE, {
      company: unique('OverviewCo'),
      title: 'Platform Engineer',
      description: JD,
      status: 'SAVED',
      priority: 'HIGH',
      location: 'Remote',
      salary: '$160k',
    });
    createdJobs.push(job.id);

    await page.goto(`/jobs/${job.id}`);
    await expect(page.getByRole('heading', { name: job.company })).toBeVisible();
    await expect(page.getByText('Platform Engineer', { exact: true })).toBeVisible();

    await expect(page.getByText('Resume Match', { exact: true })).toBeVisible();
    await expect(page.getByText('ATS Readiness', { exact: true })).toBeVisible();

    await expect(page.getByText('Job URL', { exact: true })).toBeVisible();
    await expect(page.getByText('Employment Type', { exact: true })).toBeVisible();
    await expect(page.getByText('Job Description', { exact: true })).toBeVisible();
    await expect(page.getByText('Kubernetes, AWS, TypeScript')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Analyze JD' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate Resume' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Move Status' })).toBeVisible();
  });

  test('Move Status dialog changes the job status', async ({ page, request }) => {
    const job = await createJobViaApi(request, BASE, {
      company: unique('MoveCo'),
      title: 'Some Role',
      description: 'Move me.',
      status: 'BACKLOG',
      priority: 'MEDIUM',
    });
    createdJobs.push(job.id);

    await page.goto(`/jobs/${job.id}`);
    await expect(page.getByRole('heading', { name: job.company })).toBeVisible();

    await page.getByRole('button', { name: 'Move Status' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Move Job', { exact: true })).toBeVisible();

    // Click the Applied status button (buttons show statuses uppercased).
    await dialog.getByRole('button', { name: 'APPLIED', exact: true }).click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });

    // Confirm the persisted status via the API.
    await expect
      .poll(
        async () => {
          const res = await request.get(`${BASE}/api/jobs/${job.id}`);
          return (await res.json()).data?.status;
        },
        { timeout: 15_000 },
      )
      .toBe('APPLIED');
  });

  test('Top Skills empty state prompts to analyze JD', async ({ page, request }) => {
    const job = await createJobViaApi(request, BASE, {
      company: unique('NoSkillsCo'),
      title: 'Fresh Role',
      description: 'A role with no analysis yet.',
      status: 'SAVED',
      priority: 'LOW',
    });
    createdJobs.push(job.id);

    await page.goto(`/jobs/${job.id}`);
    await expect(page.getByRole('heading', { name: job.company })).toBeVisible();
    await expect(page.getByText('Analyze the JD to surface matched skills.')).toBeVisible();
  });

  test('Analyze JD runs the slow AI flow and shows extracted skills', async ({ page, request }) => {
    test.setTimeout(240_000);
    const job = await createJobViaApi(request, BASE, {
      company: unique('AnalyzeCo'),
      title: 'Platform Engineer',
      description: JD,
      status: 'SAVED',
      priority: 'MEDIUM',
    });
    createdJobs.push(job.id);

    await page.goto(`/jobs/${job.id}`);
    await expect(page.getByRole('heading', { name: job.company })).toBeVisible();

    const [json] = await Promise.all([
      waitForApiJson(page, (u) => u.includes(`/api/jobs/${job.id}/analyze`) && !u.includes('analyze-resume'), {
        method: 'POST',
        timeout: 120_000,
      }),
      page.getByRole('button', { name: 'Analyze JD' }).click(),
    ]);

    expect(json.data?.requiredSkills.length).toBeGreaterThan(0);
    // Toast confirms completion.
    await expect(page.getByText('JD analysis completed', { exact: true })).toBeVisible();
  });

  test('Timeline tab records and renders the job-creation event', async ({ page, request }) => {
    const job = await createJobViaApi(request, BASE, {
      company: unique('TimelineCo'),
      title: 'Timeline Role',
      description: 'Timeline test.',
      status: 'SAVED',
      priority: 'LOW',
    });
    createdJobs.push(job.id);

    await page.goto(`/jobs/${job.id}`);
    await expect(page.getByRole('heading', { name: job.company })).toBeVisible();
    await page.getByRole('button', { name: 'Timeline', exact: true }).click();
    // Creating a job records a "Job created" timeline event.
    await expect(page.getByText('Job created', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('CREATED', { exact: true })).toBeVisible();
  });

  test('Notes tab renders the notes placeholder', async ({ page, request }) => {
    const job = await createJobViaApi(request, BASE, {
      company: unique('NotesCo'),
      title: 'Notes Role',
      description: 'Notes test.',
      status: 'SAVED',
      priority: 'LOW',
    });
    createdJobs.push(job.id);

    await page.goto(`/jobs/${job.id}`);
    await expect(page.getByRole('heading', { name: job.company })).toBeVisible();
    await page.getByRole('button', { name: 'Notes', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible();
    await expect(page.getByText(/backend already supports timeline events/i)).toBeVisible();
  });

  test('Nonexistent job shows the not-found error state', async ({ page }) => {
    await page.goto('/jobs/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText('Job not found')).toBeVisible();
  });
});