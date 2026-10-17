import fs from 'node:fs';
import path from 'node:path';
import { test, expect, btn, DEMO, signUpAndOnboard, uniqueEmail } from './helpers';

const BACKEND_LOG = path.join(import.meta.dirname, '.logs', 'backend.log');
const onLogin = (page: import('@playwright/test').Page) => expect(btn(page, 'Sign In')).toBeVisible();
const signedIn = (page: import('@playwright/test').Page) => expect(page.locator('button[title="Logout"]').first()).toBeVisible();

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.fill('#email', email);
  await page.fill('#password', password);
  await btn(page, 'Sign In').click();
}

test('sign-in, session restore and sign-out', async ({ page }) => {
  await page.goto('/');
  await onLogin(page);
  await signIn(page, DEMO.email, 'not-the-password');
  await expect(page.getByText('Invalid email or password')).toBeVisible();
  await signIn(page, DEMO.email, DEMO.password);
  await signedIn(page);
  await page.reload();
  await signedIn(page); // the session cookie survives a reload
  await page.locator('button[title="Logout"]').first().click();
  await onLogin(page);
  await page.reload();
  await onLogin(page);
});

test('password change signs out other devices; reset by email link works', async ({ page, browser }) => {
  const email = uniqueEmail('e2e');
  await signUpAndOnboard(page, 'E2E Tester', email, 'first-pass-123');

  const other = await (await browser.newContext()).newPage();
  await test.step('a second device signs in', async () => {
    await other.goto('/');
    await signIn(other, email, 'first-pass-123');
    await signedIn(other);
  });

  await test.step('password change needs the current password, then revokes other sessions', async () => {
    await btn(page, 'Account settings').click();
    await btn(page, 'Security & Privacy', false).click();
    await page.fill('#current-password', 'wrong-current');
    await page.fill('#new-password', 'second-pass-456');
    await btn(page, 'Update Password').click();
    await expect(page.getByText('Current password is incorrect.')).toBeVisible();
    await page.fill('#current-password', 'first-pass-123');
    await btn(page, 'Update Password').click();
    await expect(page.getByText('Password updated. Other sessions have been signed out.')).toBeVisible();
    await other.reload();
    await onLogin(other);
  });

  await test.step('sign out everywhere', async () => {
    await btn(page, 'Sign Out Everywhere').click();
    await onLogin(page);
    await signIn(page, email, 'first-pass-123');
    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  await test.step('forgot password: the emailed link sets a new password once', async () => {
    await btn(page, 'Forgot Password?').click();
    await page.fill('#email', email);
    await btn(page, 'Send Reset Link').click();
    await expect(page.getByText(/If an account exists for that email/)).toBeVisible();
    // No mail provider yet: in development the backend logs the link instead of emailing it.
    let link: string | undefined;
    await expect.poll(() => {
      const log = fs.readFileSync(BACKEND_LOG, 'utf8');
      link = [...log.matchAll(new RegExp(`reset link for ${email.replace(/[.+]/g, '\\$&')}: (\\S+)`, 'g'))].at(-1)?.[1];
      return link;
    }).toBeTruthy();
    // The link is built for the app's usual address; open the same path on the test server.
    const url = new URL(link!);
    await page.goto(`/${url.search}`);
    await page.fill('#password', 'third-pass-789');
    await btn(page, 'Set New Password').click();
    await expect(page.getByText('Password updated. Please sign in with your new password.')).toBeVisible();
    expect(page.url()).not.toContain('reset='); // the token must not linger in the address bar
    await signIn(page, email, 'third-pass-789');
    await signedIn(page);
  });
});

test('data export and permanent account deletion', async ({ page }) => {
  const email = uniqueEmail('erase');
  await signUpAndOnboard(page, 'Erase Me', email, 'erase-me-123');
  await btn(page, 'Account settings').click();
  await btn(page, 'Security & Privacy', false).click();

  const [download] = await Promise.all([page.waitForEvent('download'), btn(page, 'Download My Data').click()]);
  const data = JSON.parse(fs.readFileSync((await download.path())!, 'utf8'));
  expect(data.profile.email).toBe(email);
  expect(JSON.stringify(data)).not.toMatch(/password_hash|salt/);

  const del = btn(page, 'Delete My Account Permanently');
  await page.fill('#delete-password', 'wrong-password');
  await expect(del).toBeDisabled(); // until DELETE is typed
  await page.fill('#delete-confirm', 'DELETE');
  await del.click();
  await expect(page.getByText('That password is incorrect.')).toBeVisible();
  await page.fill('#delete-password', 'erase-me-123');
  await del.click();
  await onLogin(page);
  await signIn(page, email, 'erase-me-123');
  await expect(page.getByText('Invalid email or password')).toBeVisible();
});
