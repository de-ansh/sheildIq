import fs from 'node:fs';
import { test, expect, api, btn, inr, nav, signInDemo } from './helpers';

// Every screen shows numbers that come from the same strategy the API computes, never local guesses.
test.beforeEach(async ({ page }) => signInDemo(page));

test('dashboard shows the strategy, findings and a recommended plan for each cover type', async ({ page }) => {
  const s = (await api(page, '/strategy')).data;
  await expect(page.getByText(inr(s.life.totalNeed)).first()).toBeVisible();
  await expect(page.getByText(`${s.score}/100`).first()).toBeVisible();
  await expect(page.getByText(`Life ${inr(s.life.gap)} · Health ${inr(s.health.gap)}`).first()).toBeVisible();
  await expect(page.getByText('Key Findings')).toBeVisible();
  await expect(page.getByText(/Life cover gap of/).first()).toBeVisible();
  await expect(page.getByText(/Recommended plan for each type of cover/)).toBeVisible();
  for (const label of ['Term Life', 'Health', 'Critical Illness', 'Personal Accident']) {
    await expect(page.locator('button:visible', { hasText: label }).first()).toBeVisible();
  }
  await expect(page.locator('aside')).toHaveCount(0); // the top bar is the only navigation
});

test('coverage analysis uses the same numbers', async ({ page }) => {
  await nav(page, 'Analysis');
  const s = (await api(page, '/strategy')).data;
  await expect(page.getByText('Life Gap Breakdown')).toBeVisible();
  await expect(page.getByText(`${inr(s.life.gap)} Gap`).first()).toBeVisible();
  await expect(page.getByText(`${s.affordability.premiumToIncomeRatio}%`).first()).toBeVisible();
  await expect(page.getByText(/Weighted 55% life, 35% health/)).toBeVisible();
});

test('life calculator matches the engine and saves a plan', async ({ page }) => {
  await nav(page, 'Life Calc');
  const s = (await api(page, '/strategy')).data;
  await expect(page.getByText(inr(s.life.totalNeed)).first()).toBeVisible();
  await btn(page, 'Save as Plan').click();
  await expect(page.getByText('Saved to your plans.')).toBeVisible();
});

test('risk simulator responds to scenario and lifestyle', async ({ page }) => {
  await nav(page, 'Risk Sim');
  await expect(page.getByText('Payout Runs Out At')).toBeVisible();
  await expect(page.getByText(/pays hospital bills only/).first()).toBeVisible(); // health cover is not cash for living costs
  await btn(page, 'Early Death', false).click();
  await expect(page.getByText('Final Expenses (Immediate)')).toBeVisible();
  const runway = page.getByText(/funds the household for/).first();
  const before = await runway.textContent();
  await page.selectOption('#lifestyle-scale-select', 'Basic Survival (-25%)');
  await expect(runway).not.toHaveText(before!);
});

test('health planner recalculates when the family changes', async ({ page }) => {
  await nav(page, 'Health');
  const hero = page.locator('h1.font-mono').first();
  await expect(hero).toContainText('₹');
  const before = await hero.textContent();
  await page.fill('#hp-kids', '4');
  await expect(hero).not.toHaveText(before!);
});

test('dependency modeling sliders change the projection', async ({ page }) => {
  await nav(page, 'Dependencies');
  await expect(page.getByText(/If you died today/).first()).toBeVisible();
  const metric = page.getByText('Total Lifetime Liability').locator('xpath=..').locator('div.font-mono').first();
  const before = await metric.textContent();
  await page.getByRole('slider', { name: 'Projected general inflation' }).focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight');
  await expect(metric).not.toHaveText(before!);
  const loanText = page.getByText(/amortised over \d+ years at/).first();
  const rateBefore = await loanText.textContent();
  await page.getByRole('slider', { name: 'Loan interest rate' }).focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await expect(loanText).not.toHaveText(rateBefore!);
});

test('affordability shows the real ratios', async ({ page }) => {
  await nav(page, 'Affordability');
  const s = (await api(page, '/strategy')).data;
  await expect(page.getByText(`${s.affordability.liabilityToIncome}x`).first()).toBeVisible();
  await expect(page.getByText(`${inr(s.affordability.estimatedAnnualPremium)}/yr`).first()).toBeVisible();
});

test('compare shows 4 priced options per type and official insurer records', async ({ page }) => {
  await nav(page, 'Compare');
  const { data: types, insurerRecords } = await api(page, '/plan-options');
  for (const t of types) {
    await page.getByRole('tab', { name: new RegExp(t.label) }).click();
    await expect(page.getByText(t.recommendationReason)).toBeVisible();
    const table = page.getByRole('table', { name: /options compared/ });
    for (const o of t.options) {
      await expect(page.getByRole('heading', { name: o.name, exact: true })).toBeVisible();
      await expect(table).toContainText(inr(o.annualPremium));
    }
  }
  await page.getByRole('tab', { name: /Term Life/ }).click();
  const life = page.getByRole('table', { name: /Life insurers' claim and service records/ });
  await expect(life.getByRole('row')).toHaveCount(insurerRecords.life.length + 1);
  await expect(life).toContainText('LIC');
  await page.getByRole('tab', { name: /Saved Strategies/ }).click();
  await expect(page.getByText(/Life cover ₹/).first()).toBeVisible();
});

test('fine print opens the right plan in Deep Dive', async ({ page }) => {
  await nav(page, 'Compare');
  await page.getByRole('tab', { name: /Health/ }).click();
  await page.getByRole('button', { name: /Fine Print/ }).nth(1).click();
  await expect(page.getByRole('heading', { name: 'Base Policy + Super Top-Up' })).toBeVisible();
  const body = await page.locator('main').innerText();
  expect(body).not.toMatch(/\$\d|Institutional|Clause Parser/);
});

test('saved plans: snapshot, progress over time, CSV export, delete', async ({ page }) => {
  await nav(page, 'Saved Plans');
  await btn(page, 'Save Current Plan', false).click();
  await page.fill('input[placeholder="e.g. Q4 Growth & Term Protection"]', 'E2E Strategy Snapshot');
  await btn(page, 'Save Plan').click();
  const plans = page.getByRole('table').last();
  await expect(plans.getByRole('row', { name: /E2E Strategy Snapshot/ })).toBeVisible();
  await expect(page.getByText('Progress Over Time')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), btn(page, 'Export CSV', false).click()]);
  const csv = fs.readFileSync((await download.path())!, 'utf8');
  expect(csv.startsWith('"ID"')).toBe(true);
  expect(csv).toContain('E2E Strategy Snapshot');
  await plans.getByRole('row', { name: /E2E Strategy Snapshot/ }).locator('button[title="Delete Plan"]').click();
  await expect(plans.getByRole('row', { name: /E2E Strategy Snapshot/ })).toHaveCount(0);
});

test('settings change recalculates the strategy', async ({ page }) => {
  const before = (await api(page, '/strategy')).data.life.totalNeed;
  await btn(page, 'Account settings').click();
  await btn(page, 'Regional & Baseline', false).click();
  await page.fill('#settings-age', '45');
  await btn(page, 'Save Changes', false).click();
  await expect(page.getByText('Profile saved. Your strategy has been recalculated.')).toBeVisible();
  expect((await api(page, '/strategy')).data.life.totalNeed).toBeLessThan(before); // fewer working years left
  await page.fill('#settings-age', '34');
  await btn(page, 'Save Changes', false).click();
  await expect(page.getByText(/Profile saved/)).toBeVisible();
});

test('system status and compliance pages tell the truth', async ({ page }) => {
  await btn(page, 'System Status').click();
  await expect(page.getByText('All Systems Operational')).toBeVisible();
  await nav(page, 'Dashboard');
  await btn(page, 'Disclaimer & Compliance Disclosure').click();
  await expect(page.getByText('Data Protection & Security').first()).toBeVisible();
  expect(await page.locator('main').innerText()).not.toMatch(/SOC 2|zero-knowledge|end-to-end encrypted|mortality tables, published/i);
});
