import { test, expect, btn, signInDemo } from './helpers';

// Real provider calls cost money and need keys, so these run only with E2E_AI=1.
test.skip(process.env.E2E_AI !== '1', 'set E2E_AI=1 to run the AI tests against the real provider');

test('Ask ShieldIQ streams an answer grounded in the user’s numbers and remembers it', async ({ page }) => {
  await signInDemo(page);
  await page.getByRole('button', { name: 'Ask ShieldIQ' }).click();
  await page.getByLabel('Your question').fill('Should I prepay my home loan or buy more term cover?');
  await btn(page, 'Send').click();
  await expect(page.getByRole('button', { name: 'Clear conversation' })).toBeVisible({ timeout: 60_000 }); // answer finished
  const answer = page.locator('[role="dialog"] .bg-muted.text-foreground').last();
  await expect(answer).toContainText('₹');
  await expect(answer).not.toContainText('---');
  await page.reload();
  await page.getByRole('button', { name: 'Ask ShieldIQ' }).click();
  // The restored message bubble, not the identical suggested-question button.
  await expect(page.locator('[role="dialog"] div.bg-blue-600', { hasText: 'Should I prepay my home loan or buy more term cover?' })).toBeVisible();
});

test('Explain This Result describes the life calculator in plain words', async ({ page }) => {
  await signInDemo(page);
  await page.locator('header nav:visible button', { hasText: /^\s*Life Calc\s*$/i }).first().click();
  await btn(page, /Explain This Result/, false).click();
  await expect(page.getByText(/₹/).first()).toBeVisible({ timeout: 60_000 });
});
