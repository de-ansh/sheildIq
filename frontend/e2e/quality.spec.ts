import AxeBuilder from '@axe-core/playwright';
import { test, expect, btn, nav, signInDemo } from './helpers';

const SCREENS = ['Dashboard', 'Compare', 'Analysis', 'Risk Sim', 'Life Calc', 'Affordability', 'Dependencies', 'Health', 'Saved Plans', 'Deep Dive', 'Policy Scan'];

for (const theme of ['dark', 'light'] as const) {
  test(`every screen meets WCAG 2 AA in ${theme} mode`, async ({ page }) => {
    await page.addInitScript(t => localStorage.setItem('shield-iq-theme', t), theme);
    await page.goto('/');
    const scan = async (where: string) => {
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(violations.map(v => `${where}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target.join(' ')} ${JSON.stringify(v.nodes[0]?.any[0]?.data ?? '')}`)).toEqual([]);
    };
    await scan('Login');
    await signInDemo(page);
    for (const s of SCREENS) {
      await nav(page, s);
      await page.waitForLoadState('networkidle');
      await scan(s);
    }
    await btn(page, 'Account settings').click();
    await scan('Settings');
  });
}

const WIDTHS = [320, 375, 414, 768, 1024, 1280, 1440, 1919, 1920, 2560];

test('no screen scrolls sideways and tab labels never wrap, from 320px to 2560px', async ({ page }) => {
  await signInDemo(page);
  const problems: string[] = [];
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const s of SCREENS) {
      await nav(page, s);
      await page.waitForLoadState('networkidle');
      const issues = await page.evaluate(() => {
        const out: string[] = [];
        const W = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth > W + 1) out.push(`page is ${document.documentElement.scrollWidth}px wide`);
        for (const span of document.querySelectorAll<HTMLElement>('header nav button span')) {
          if (span.offsetParent && span.getClientRects().length > 1) out.push(`tab "${span.textContent}" wraps`);
        }
        return out;
      });
      problems.push(...issues.map(i => `${width}px ${s}: ${i}`));
    }
  }
  expect(problems).toEqual([]);
});

test('phone menu: large targets, keyboard friendly, shows where you are', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signInDemo(page);
  const toggle = page.getByRole('button', { name: /^Menu/ });
  await expect(toggle).toContainText('Dashboard');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  const menu = page.locator('#mobile-menu');
  await expect(menu.getByRole('button')).toHaveCount(SCREENS.length + 1); // + the language switch
  for (const item of await menu.getByRole('button').all()) {
    expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(44); // comfortable touch target
  }
  await expect(menu.getByRole('button', { name: 'Dashboard' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await toggle.click();
  await menu.getByRole('button', { name: 'Compare' }).click();
  await expect(page.getByText('Plan Options & Comparison')).toBeVisible();
  await expect(toggle).toContainText('Compare');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
