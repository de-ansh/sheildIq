import { test as base, expect, type Page } from '@playwright/test';

export { expect };

export const DEMO = { email: 'alex.vance@shieldiq.internal', password: 'Password123!' };

/** Same rupee formatting as the app's formatINR. */
export const inr = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e7) return `₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `₹${(a / 1e5).toFixed(1)}L`;
  return `₹${Math.round(a).toLocaleString('en-IN')}`;
};

/** Goes to a screen the way a user would at this width: tabs on wider screens, the Menu button on phones. */
export async function nav(page: Page, label: string) {
  const menu = page.getByRole('button', { name: /^Menu/ });
  if (await menu.isVisible()) {
    if ((await menu.getAttribute('aria-expanded')) !== 'true') await menu.click();
  }
  await page.locator('header nav:visible button').filter({ hasText: new RegExp(`^\\s*${label}\\s*$`, 'i') }).first().click();
}

export const btn = (page: Page, name: string | RegExp, exact = true) => page.getByRole('button', { name, exact }).first();

/** GET from the API with the page's session cookie. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const api = async (page: Page, path: string): Promise<any> => (await page.request.get(`/api/v1${path}`)).json();

export async function signInDemo(page: Page) {
  await page.goto('/');
  await btn(page, 'One-Click Demo Sign-In (Alex Vance)').click();
  await expect(page.getByText('Life Cover Need')).toBeVisible();
}

export const uniqueEmail = (tag: string) => `${tag}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;

/** Registers a new account and completes onboarding with the minimum answers. */
export async function signUpAndOnboard(page: Page, name: string, email: string, password: string) {
  await page.goto('/');
  await btn(page, 'Sign Up').click();
  await page.fill('#name', name);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await btn(page, 'Create Account').click();
  await page.fill('#age-input', '33');
  await page.fill('#income-input', '1600000');
  await page.selectOption('#city-select', 'Tier 1 (Metro)');
  await btn(page, /Continue/, false).click();
  await page.fill('#expenses-input', '50000');
  await btn(page, /Continue/, false).click();
  await btn(page, /Generate Policy Gap/, false).click();
  await expect(page.getByText('Life Cover Need')).toBeVisible();
}

/**
 * Every test fails on a crashed page, an unexpected console error or a 5xx from the API: the blank-screen class
 * of bug (a render error unmounting the app) shows up here even when the asserted text happens to be absent anyway.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const problems: string[] = [];
    page.on('pageerror', e => problems.push(`page error: ${e.message}`));
    page.on('console', m => {
      // The signed-out session probe answers 401, and a few forms show 400 validation answers on purpose.
      if (m.type() === 'error' && !/status of (401|400)/.test(m.text())) problems.push(`console: ${m.text()}`);
    });
    page.on('response', r => {
      if (r.url().includes('/api/') && r.status() >= 500) problems.push(`${r.status()} ${r.request().method()} ${r.url()}`);
    });
    await use(page);
    expect(problems, 'browser errors during the test').toEqual([]);
  },
});
