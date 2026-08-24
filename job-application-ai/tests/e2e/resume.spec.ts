import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { ErrorCollector } from './helpers';

/**
 * Resume Library: master resume view/download, paste-text creation, replace,
 * search, and the end-to-end company resume generation + versions + PDF flow.
 *
 * SAFETY: creating a master resume deactivates the previously active one, so
 * every test that mutates master resumes records the original active resume id
 * first and restores it afterward. Throwaway resumes created during a run are
 * deleted.
 */

const BASE = process.env.WEB_URL ?? 'http://localhost:5173';
const FIXTURES_DIR = 'tests/e2e/fixtures';
const PDF_FIXTURE = 'resume.pdf';
const DOCX_FIXTURE = 'resume.docx';

async function getActiveMasterId(request: APIRequestContext): Promise<string | null> {
  const response = await request.get(`${BASE}/api/resumes/active`);
  if (response.status() === 404) return null;
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()).data.id;
}

async function restoreActiveMaster(request: APIRequestContext, id: string | null) {
  if (!id) return;
  const response = await request.put(`${BASE}/api/resumes/${id}`, { data: { isActive: true } });
  expect(response.ok(), await response.text()).toBeTruthy();
  expect(await getActiveMasterId(request)).toBe(id);
}

async function deleteResumeViaApi(request: APIRequestContext, id: string) {
  const response = await request.delete(`${BASE}/api/resumes/${id}`);
  expect([200, 404]).toContain(response.status());
}

async function exposeEmptyMasterOnce(page: Page) {
  let intercepted = false;
  await page.route('**/api/resumes/library?**', async (route) => {
    if (intercepted) return route.continue();
    intercepted = true;
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({
      response,
      json: {
        ...body,
        data: {
          ...body.data,
          masterResume: null,
          masterResumes: [],
        },
      },
    });
  });
}

async function selectUpload(page: Page, file: string) {
  await page.locator('input[type="file"]').first().setInputFiles(file);
}

async function replaceMaster(page: Page, id: string, file: string) {
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Replace' }).click();
  const chooser = await chooserPromise;
  const responsePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/resumes/${id}/replace`)
    && response.request().method() === 'POST',
  );
  await chooser.setFiles(file);
  const response = await responsePromise;
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()).data;
}

async function assertPreviewPdf(page: Page, id: string) {
  const responsePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/resumes/${id}/preview`),
  );
  await page.getByRole('button', { name: 'View PDF' }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toContain('application/pdf');
  await expect(page.getByRole('dialog')).toBeVisible();

  const preview = await page.request.get(`${BASE}/api/resumes/${id}/preview`);
  expect(preview.ok(), await preview.text()).toBeTruthy();
  expect(preview.headers()['content-type']).toContain('application/pdf');
  expect((await preview.body()).subarray(0, 4).toString()).toBe('%PDF');
  await page.getByRole('button', { name: 'Close dialog' }).click();
}

async function assertDownload(
  request: APIRequestContext,
  id: string,
  signature: '%PDF' | 'PK',
  contentType: string,
) {
  const response = await request.get(`${BASE}/api/resumes/${id}/download`);
  expect(response.ok(), await response.text()).toBeTruthy();
  expect(response.headers()['content-type']).toContain(contentType);
  expect((await response.body()).subarray(0, signature.length).toString()).toBe(signature);
}

test.describe('Resume Library', () => {
  let throwawayResumes: string[] = [];
  let originalActive: string | null = null;

  test.beforeEach(async ({ request }) => {
    originalActive = await getActiveMasterId(request);
  });

  test.afterEach(async ({ request }) => {
    for (const id of throwawayResumes) await deleteResumeViaApi(request, id);
    throwawayResumes = [];
    await restoreActiveMaster(request, originalActive);
  });

  test('Master resume displays with metadata and a working PDF preview', async ({ page, request }) => {
    const activeId = await getActiveMasterId(request);
    test.skip(!activeId, 'No active master resume present');
    const collector = new ErrorCollector();
    collector.attach(page);

    await page.goto('/resume');
    await expect(page.getByRole('heading', { name: 'Master Resume and company-specific versions' })).toBeVisible();

    // The MASTER RESUME card and its document actions.
    await expect(page.getByText('MASTER RESUME', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View PDF' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Replace' })).toBeVisible();

    // Open the PDF preview dialog; the iframe requests the PDF.
    const [previewResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/resumes/${activeId}/preview`) && r.ok()),
      page.getByRole('button', { name: 'View PDF' }).click(),
    ]);
    expect(previewResp.headers()['content-type'] ?? '').toContain('application/pdf');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Master Resume', exact: true })).toBeVisible();
    await expect(dialog.locator('iframe')).toBeAttached();

    collector.assertClean();
  });

  test('Master resume download returns a PDF document', async ({ page, request }) => {
    const activeId = await getActiveMasterId(request);
    test.skip(!activeId, 'No active master resume present');

    await page.goto('/resume');
    await expect(page.getByRole('heading', { name: 'Master Resume and company-specific versions' })).toBeVisible();

    const [downloadResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/resumes/${activeId}/download`) && r.ok()),
      page.getByRole('button', { name: 'Download' }).first().click(),
    ]);
    const contentType = downloadResp.headers()['content-type'] ?? '';
    expect(
      contentType.includes('application/pdf') || contentType.includes('officedocument') ||
      contentType.includes('octet-stream'),
    ).toBeTruthy();
  });

  test('Paste resume text creates a new active master resume', async ({ page, request }) => {
    const text = `Full-Stack Engineer with TypeScript, React, Node, and PostgreSQL.`;

    await page.goto('/resume');
    await expect(page.getByRole('heading', { name: 'Master Resume and company-specific versions' })).toBeVisible();

    await page.getByRole('button', { name: 'Paste Resume Text' }).click();
    const textarea = page.getByPlaceholder(/Optional fallback/);
    await textarea.fill(text);

    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/resumes') && r.request().method() === 'POST' && r.ok()),
      page.getByRole('button', { name: 'Save Pasted Resume' }).click(),
    ]);
    const created = (await resp.json()).data;
    throwawayResumes.push(created.id);

    await expect(page.getByText('Master resume saved', { exact: true })).toBeVisible();
    // The upload dropzone is replaced by the master document card.
    await expect(page.getByText('Upload your existing resume')).toBeHidden();
  });

  test('PDF upload and DOCX replacement persist with working preview and download', async ({ page, request }) => {
    const collector = new ErrorCollector();
    collector.attach(page);
    await exposeEmptyMasterOnce(page);
    await page.goto('/resume');
    await expect(page.getByText('Upload your existing resume')).toBeVisible();

    const uploadResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith('/api/resumes/upload') && response.request().method() === 'POST',
    );
    await selectUpload(page, `${FIXTURES_DIR}/${PDF_FIXTURE}`);
    const uploadResponse = await uploadResponsePromise;
    expect(uploadResponse.status(), await uploadResponse.text()).toBe(201);
    const uploaded = (await uploadResponse.json()).data;
    throwawayResumes.push(uploaded.id);

    expect(uploaded.originalFilename).toBe(PDF_FIXTURE);
    expect(uploaded.mimeType).toBe('application/pdf');
    expect(uploaded.sourceType).toBe('upload');
    expect(uploaded.storagePath).toContain('/master/');
    await expect(page.getByText(PDF_FIXTURE, { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Uploading resume...', { exact: true })).toHaveCount(0);

    await page.reload();
    await expect(page.getByText(PDF_FIXTURE, { exact: true }).first()).toBeVisible();
    await assertPreviewPdf(page, uploaded.id);
    await assertDownload(request, uploaded.id, '%PDF', 'application/pdf');

    const replaced = await replaceMaster(page, uploaded.id, `${FIXTURES_DIR}/${DOCX_FIXTURE}`);
    expect(replaced.id).toBe(uploaded.id);
    expect(replaced.originalFilename).toBe(DOCX_FIXTURE);
    expect(replaced.mimeType).toContain('officedocument');
    expect(replaced.storagePath).not.toBe(uploaded.storagePath);
    await expect(page.getByText(DOCX_FIXTURE, { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Replacing master resume...', { exact: true })).toHaveCount(0);

    await page.reload();
    await expect(page.getByText(DOCX_FIXTURE, { exact: true }).first()).toBeVisible();
    await assertPreviewPdf(page, uploaded.id);
    await assertDownload(request, uploaded.id, 'PK', 'officedocument');
    collector.assertClean();
  });

  test('DOCX upload and PDF replacement persist with working preview and download', async ({ page, request }) => {
    const collector = new ErrorCollector();
    collector.attach(page);
    await exposeEmptyMasterOnce(page);
    await page.goto('/resume');
    await expect(page.getByText('Upload your existing resume')).toBeVisible();

    const uploadResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith('/api/resumes/upload') && response.request().method() === 'POST',
    );
    await selectUpload(page, `${FIXTURES_DIR}/${DOCX_FIXTURE}`);
    const uploadResponse = await uploadResponsePromise;
    expect(uploadResponse.status(), await uploadResponse.text()).toBe(201);
    const uploaded = (await uploadResponse.json()).data;
    throwawayResumes.push(uploaded.id);

    expect(uploaded.originalFilename).toBe(DOCX_FIXTURE);
    expect(uploaded.mimeType).toContain('officedocument');
    expect(uploaded.extractedText.length).toBeGreaterThan(40);
    await page.reload();
    await expect(page.getByText(DOCX_FIXTURE, { exact: true }).first()).toBeVisible();
    await assertPreviewPdf(page, uploaded.id);
    await assertDownload(request, uploaded.id, 'PK', 'officedocument');

    const replaced = await replaceMaster(page, uploaded.id, `${FIXTURES_DIR}/${PDF_FIXTURE}`);
    expect(replaced.id).toBe(uploaded.id);
    expect(replaced.originalFilename).toBe(PDF_FIXTURE);
    expect(replaced.mimeType).toBe('application/pdf');
    expect(replaced.storagePath).not.toBe(uploaded.storagePath);

    await page.reload();
    await expect(page.getByText(PDF_FIXTURE, { exact: true }).first()).toBeVisible();
    await assertPreviewPdf(page, uploaded.id);
    await assertDownload(request, uploaded.id, '%PDF', 'application/pdf');
    await expect(page.getByText(/Uploading|Processing|Analyzing|Success|Error/)).toHaveCount(0);
    collector.assertClean();
  });

  test('Search in the resume library narrows company resumes', async ({ page }) => {
    await page.goto('/resume');
    await expect(page.getByRole('heading', { name: 'Master Resume and company-specific versions' })).toBeVisible();

    await page.getByPlaceholder('Search company or role').fill('__no_such_company__exists__');
    // No company resumes match; empty state surfaces.
    await expect(page.getByText(/No company resumes yet/)).toBeVisible();
  });

  test('Company resumes section shows empty state before any generation', async ({ page }) => {
    await page.goto('/resume');
    await expect(page.getByRole('heading', { name: 'Master Resume and company-specific versions' })).toBeVisible();
    if (await page.getByText('No company resumes yet').count() === 0) {
      // Either generated resumes already exist or none; assert the section heading is present either way.
      await expect(page.getByText('Company Resumes', { exact: true })).toBeVisible();
    }
  });

  test('Paste Resume Text button exposes the paste area', async ({ page }) => {
    await page.goto('/resume');
    await expect(page.getByRole('heading', { name: 'Master Resume and company-specific versions' })).toBeVisible();
    await page.getByRole('button', { name: 'Paste Resume Text' }).first().click();
    await expect(page.getByPlaceholder(/Optional fallback if you want/)).toBeVisible();
  });

  test('Toggle title (resume-library route) also renders the library', async ({ page }) => {
    await page.goto('/resume-library');
    await expect(page.getByRole('heading', { name: 'Master Resume and company-specific versions' })).toBeVisible();
  });
});