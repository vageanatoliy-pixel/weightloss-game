import { expect, test, type Page } from '@playwright/test';

const login = async (page: Page) => {
  await page.goto('/');
  await page.getByTestId('email-input').fill('admin@demo.com');
  await page.getByTestId('password-input').fill('password123');
  await page.getByTestId('auth-submit').click();
  await expect(page.getByTestId('home-title')).toBeVisible();
};

test('auth + home renders', async ({ page }) => {
  await login(page);
  await expect(page.getByText('Раунд зараз')).toBeVisible();
});

test('leaderboard is public-safe (no weightKg)', async ({ page }) => {
  await login(page);
  await page.getByTestId('nav-leaders').click();
  await expect(page.getByText('Leaderboard')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('weightKg');
});

test('if start/finish flow works', async ({ page }) => {
  await login(page);
  await page.getByTestId('nav-if').click();

  const status = page.getByTestId('if-status');

  // Ensure clean state for idempotent run.
  await page.getByTestId('if-finish').click().catch(() => undefined);

  await page.getByTestId('if-start').click();
  await expect(status).toContainText('FASTING');

  await page.getByTestId('if-finish').click();
  await expect(status).toContainText('EATING');
});
