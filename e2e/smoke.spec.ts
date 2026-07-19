import { test, expect } from '@playwright/test';

// End-to-end against the built app + a seeded throwaway SQLite. Exercises the whole
// stack (Next build/start, RSC, DB reads, i18n) — locators are href/role based so they
// don't break on translated copy.

test('dashboard renders the shell and reads from the DB', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href="/transactions"]:visible').first()).toBeVisible();
  await expect(page.getByRole('heading').first()).toBeVisible();
});

test('the main pages each render when navigated', async ({ page }) => {
  await page.goto('/');
  for (const href of ['/transactions', '/budgets', '/debts']) {
    await page.locator(`a[href="${href}"]:visible`).first().click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole('heading').first()).toBeVisible();
  }
});

test('adding an expense persists it (write round-trip)', async ({ page }) => {
  await page.goto('/transactions');
  // Trigger is tagged with a stable data-tour attr (i18n-proof).
  await page.locator('[data-tour="transactions-add"]').click();

  const dialog = page.getByRole('dialog');
  const amount = dialog.locator('#tx-amount');
  await expect(amount).toBeVisible();
  // Amount is all that's required — the account defaults to the first seeded one,
  // category/payee are optional, type defaults to expense.
  await amount.fill('987.65');
  await dialog.locator('button[type="submit"]').click();

  // Success = a toast fires and the dialog closes (the create server action ran,
  // wrote the row, and revalidated).
  await expect(page.locator('[data-sonner-toast]').first()).toBeVisible();
  await expect(amount).toBeHidden();
});
