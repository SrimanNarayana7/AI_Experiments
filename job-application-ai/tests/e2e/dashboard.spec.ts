import { test, expect } from '@playwright/test';
import { ErrorCollector } from './helpers';

/**
 * App shell: navigation, layout, and the Dashboard page.
 */

test.describe('App shell & Dashboard', () => {
  test('Dashboard loads with nav, KPIs and quick actions, no console errors', async ({
    page,
  }) => {
    const collector = new ErrorCollector();
    collector.attach(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Application command center' })).toBeVisible();
    // KPIs only render once the dashboard analytics request resolves.
    await expect(page.getByText('Total Jobs')).toBeVisible();

    // Sidebar navigation is present.
    const sidebar = page.locator('aside');
    await expect(sidebar.getByText('Job AI Copilot').first()).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeAttached();
    await expect(sidebar.getByRole('link', { name: 'Jobs' })).toBeAttached();
    await expect(sidebar.getByRole('link', { name: 'Resume Library' })).toBeAttached();
    await expect(sidebar.getByRole('link', { name: 'Analytics' })).toBeAttached();
    await expect(sidebar.getByRole('link', { name: 'Settings' })).toBeAttached();

    // KPI cards
    await expect(page.getByText('Total Jobs', { exact: true })).toBeVisible();
    await expect(page.getByText('Applications', { exact: true })).toBeVisible();
    await expect(page.getByText('Interviews', { exact: true })).toBeVisible();
    await expect(page.getByText('Offers', { exact: true })).toBeVisible();
    await expect(page.getByText('Avg Match Score', { exact: true })).toBeVisible();

    // Quick actions
    await expect(page.getByText('Add Job', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Upload Master Resume').first()).toBeVisible();
    await expect(page.getByText('Generate Resume').first()).toBeVisible();
    await expect(page.getByText('View Resume Library').first()).toBeVisible();

    collector.assertClean();
  });

  test('Header search button opens the command palette', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Application command center')).toBeVisible();
    await page.getByRole('button', { name: /Search jobs, companies, versions/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Search', { exact: true }).first()).toBeVisible();
    // Trigger results with a query; either results render or a no-results note.
    const input = dialog.getByPlaceholder(/Search Amazon/);
    await input.fill('zzz-no-such-result');
    await expect(dialog.getByText('No results found.')).toBeVisible();
    await input.fill('');
    await expect(dialog.getByText(/Search across companies, job titles/)).toBeVisible();
  });

  test('Notification bell toggles the notifications panel', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Application command center')).toBeVisible();
    await page.getByRole('button', { name: 'Notifications' }).click();
    await expect(page.getByText('Notifications', { exact: true })).toBeVisible();
    const panel = page.getByText('Recent activity and app updates');
    await expect(panel).toBeVisible();
  });

  test('Sidebar navigation routes to each section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Application command center')).toBeVisible();
    const sidebar = page.locator('aside');

    await sidebar.getByRole('link', { name: 'Jobs' }).click();
    await expect(page.getByRole('heading', { name: 'Job Tracker' })).toBeVisible();

    await sidebar.getByRole('link', { name: 'Resume Library' }).click();
    await expect(page.getByRole('heading', { name: 'Master Resume and company-specific versions' })).toBeVisible();

    await sidebar.getByRole('link', { name: 'Analytics' }).click();
    await expect(page.getByRole('heading', { name: 'Application performance' })).toBeVisible();

    await sidebar.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Application settings' })).toBeVisible();

    await sidebar.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Application command center' })).toBeVisible();
  });

  test('Command palette shortcut Ctrl+K opens and Escape closes', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Application command center')).toBeVisible();
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});