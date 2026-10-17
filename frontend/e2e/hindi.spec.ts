import AxeBuilder from '@axe-core/playwright';
import { test, expect, api, btn } from './helpers';

test('a Hindi speaker can switch language before signing in, and it follows their account', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'हिंदी' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await btn(page, 'एक क्लिक में डेमो साइन इन (Alex Vance)').click();

  await test.step('the dashboard and key findings are in Hindi', async () => {
    await expect(page.getByRole('heading', { name: 'डैशबोर्ड' })).toBeVisible();
    await expect(page.getByText('ज़रूरी जीवन बीमा कवर')).toBeVisible();
    await expect(page.getByText('मुख्य बातें')).toBeVisible();
    const s = (await api(page, '/strategy')).data;
    await expect(page.getByText(`जीवन बीमा में ${(s.life.gap / 1e7).toFixed(2).replace(/^/, '₹')} Cr की कमी`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'डैशबोर्ड' }).first()).toBeVisible(); // navigation
  });

  await test.step('the choice is saved to the account and survives a reload', async () => {
    await expect.poll(async () => (await api(page, '/user/profile')).user.language).toBe('hi');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'डैशबोर्ड' })).toBeVisible();
  });

  await test.step('Hindi pages pass the accessibility checks', async () => {
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations.map(v => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
  });

  await test.step('switching back to English', async () => {
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('heading', { name: 'Analytical Dashboard' })).toBeVisible();
    await expect.poll(async () => (await api(page, '/user/profile')).user.language).toBe('en');
  });
});
