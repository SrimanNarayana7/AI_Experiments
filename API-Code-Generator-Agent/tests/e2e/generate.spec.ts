import { test, expect } from '@playwright/test';

test('generates a Playwright test project from a spec URL', async ({ page }) => {
  await page.goto('http://localhost:5173/generate');

  await page.getByRole('combobox').selectOption('playwright');
  await page.getByPlaceholder('https://example.com/openapi.json').fill(
    'https://petstore.swagger.io/v2/swagger.json',
  );

  await page.getByRole('button', { name: 'Analyze Specification' }).click();

  await expect(page.getByText('Petstore')).toBeVisible({ timeout: 30000 });

  await page.getByRole('button', { name: 'Generate Tests' }).click();

  await expect(page.getByText('Generation Complete')).toBeVisible({ timeout: 60000 });
});
