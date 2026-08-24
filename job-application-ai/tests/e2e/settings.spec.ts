import { test, expect, Page } from '@playwright/test';
import { ErrorCollector } from './helpers';

/**
 * Settings page and theme switching (Light / Dark / System),
 * including persistence across reloads.
 */

const BASE = process.env.WEB_URL ?? 'http://localhost:5173';

/** A field's input located by its rendered <label> text. */
function fieldInput(page: Page, label: string) {
  return page.locator('label', { hasText: label }).locator('..').locator('input').first();
}

/** Theme selector buttons render their name + a hint, so match by prefix. */
const themeButton = (page: Page, option: string) =>
  page.getByRole('button', { name: new RegExp(`^${option}`) }).first();

async function resetTheme(page: Page) {
  await page.evaluate(() => localStorage.setItem('jai-theme', 'SYSTEM'));
}

test.describe('Settings & Theme', () => {
  test.afterEach(async ({ page }) => resetTheme(page));

  test('Settings page renders all sections and fields', async ({ page }) => {
    const collector = new ErrorCollector();
    collector.attach(page);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Application settings' })).toBeVisible();

    await expect(page.getByText('Appearance', { exact: true })).toBeVisible();
    await expect(page.getByText('AI', { exact: true })).toBeVisible();
    await expect(page.getByText('Resume', { exact: true })).toBeVisible();
    await expect(page.getByText('PDF', { exact: true })).toBeVisible();
    await expect(page.getByText('Storage', { exact: true })).toBeVisible();
    await expect(page.getByText('Application', { exact: true })).toBeVisible();

    // AI fields
    await expect(fieldInput(page, 'AI Model')).toHaveValue('deepseek-v4-flash');
    await expect(fieldInput(page, 'Target Score')).toHaveValue('85');

    // Theme selector present
    await expect(themeButton(page, 'SYSTEM')).toBeVisible();
    await expect(themeButton(page, 'LIGHT')).toBeVisible();
    await expect(themeButton(page, 'DARK')).toBeVisible();

    collector.assertClean();
  });

  test('Theme buttons apply the correct resolved theme', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Application settings' })).toBeVisible();

    await themeButton(page, 'LIGHT').click();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
    expect(await page.evaluate(() => localStorage.getItem('jai-theme'))).toBe('LIGHT');

    await themeButton(page, 'DARK').click();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
    expect(await page.evaluate(() => localStorage.getItem('jai-theme'))).toBe('DARK');
  });

  test('Header theme toggle cycles System -> Light -> Dark', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Application command center')).toBeVisible();

    const toggle = page.getByRole('button', { name: 'Toggle theme' });
    await expect(toggle).toBeVisible();

    const label = () => page.evaluate(() => localStorage.getItem('jai-theme'));
    // Default is SYSTEM; first click -> LIGHT.
    await toggle.click();
    expect(await label()).toBe('LIGHT');
    // second click -> DARK
    await toggle.click();
    expect(await label()).toBe('DARK');
    // third -> SYSTEM
    await toggle.click();
    expect(await label()).toBe('SYSTEM');
  });

  test('Theme persists across reload', async ({ page }) => {
    await page.goto('/settings');
    await themeButton(page, 'DARK').click();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');

    await page.reload();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  });

  test('Editing an AI setting and reloading keeps the value', async ({ page }) => {
    await page.goto('/settings');
    await fieldInput(page, 'Target Score').fill('92');
    await page.reload();
    await expect(fieldInput(page, 'Target Score')).toHaveValue('92');
    // restore default
    await fieldInput(page, 'Target Score').fill('85');
    await page.reload();
    await expect(fieldInput(page, 'Target Score')).toHaveValue('85');
  });
});