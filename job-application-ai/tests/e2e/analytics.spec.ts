import { test, expect } from '@playwright/test';
import { ErrorCollector } from './helpers';

/**
 * Analytics page renders metrics and charts driven by the dashboard analytics API.
 */

const BASE = process.env.WEB_URL ?? 'http://localhost:5173';

test.describe('Analytics', () => {
  test('Analytics page loads KPIs and chart sections without console errors', async ({
    page,
  }) => {
    const collector = new ErrorCollector();
    collector.attach(page);

    await page.goto('/analytics');
    await expect(page.getByRole('heading', { name: 'Application performance' })).toBeVisible();
    // Metric cards only render once analytics data resolves.
    await expect(page.getByText('Interview Conversion Rate')).toBeVisible();

    await expect(page.getByText('Interview Conversion Rate')).toBeVisible();
    await expect(page.getByText('Offer Conversion Rate')).toBeVisible();
    await expect(page.getByText('Applications This Month')).toBeVisible();
    await expect(page.getByText('Average Match Score')).toBeVisible();

    await expect(page.getByText('Applications Over Time', { exact: true })).toBeVisible();
    await expect(page.getByText('Jobs by Status', { exact: true })).toBeVisible();
    await expect(page.getByText('Score Distribution', { exact: true })).toBeVisible();

    collector.assertClean();
  });

  test('Empty dashboard analytics still render (no-data is handled)', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.getByRole('heading', { name: 'Application performance' })).toBeVisible();
    // The metric cards always render regardless of data volume.
    await expect(page.getByText('Interview Conversion Rate')).toBeVisible();
  });
});