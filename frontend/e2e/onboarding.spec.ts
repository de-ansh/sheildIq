import { test, expect, api, btn, inr, nav, uniqueEmail } from './helpers';

test('a new user is onboarded and every answer reaches their strategy', async ({ page }) => {
  await test.step('sign up lands on a blank onboarding form', async () => {
    await page.goto('/');
    await btn(page, 'Sign Up').click();
    await page.fill('#name', 'Meera Iyer');
    await page.fill('#email', uniqueEmail('onboard'));
    await page.fill('#password', 'onboarding-pass-1');
    await btn(page, 'Create Account').click();
    await expect(page.getByText('Step 1 of 3')).toBeVisible();
    await expect(page.locator('#income-input')).toHaveValue('');
  });

  await test.step('required answers are enforced', async () => {
    await page.fill('#age-input', '29');
    await btn(page, /Continue/, false).click();
    await expect(page.getByText('Enter your annual gross income.')).toBeVisible();
  });

  await test.step('all three steps are filled in', async () => {
    await page.fill('#income-input', '1800000');
    await page.selectOption('#city-select', 'Tier 2 (Emerging Metro)');
    await page.fill('#occupation-input', 'Data Analyst');
    await btn(page, /Continue/, false).click();
    await btn(page, 'Married').click();
    await page.fill('#spouse-income-input', '900000');
    await btn(page, '+ Add Dependent').click();
    await page.getByLabel('Age of dependent 1').fill('6');
    await btn(page, '+ Add Dependent').click();
    await page.getByLabel('Relationship of dependent 2').selectOption('parent');
    await page.getByLabel('Age of dependent 2').fill('64');
    await page.fill('#home-loan-input', '3000000');
    await page.fill('#other-loans-input', '200000');
    await page.fill('#expenses-input', '55000');
    await page.fill('#emi-input', '32000');
    await page.fill('#loan-years-input', '12');
    await btn(page, /Continue/, false).click();
    await expect(page.getByText('Protection & Lifestyle').first()).toBeVisible();
    await page.fill('#life-cover-input', '5000000');
    await page.fill('#health-cover-input', '300000');
    await page.fill('#parents-cover-input', '200000');
    await page.fill('#ci-cover-input', '1000000');
    await page.fill('#pa-cover-input', '2500000');
    const tobacco = page.getByRole('checkbox', { name: 'Tobacco/Smoking' });
    await tobacco.click(); // the box itself must toggle exactly once
    await expect(tobacco).toBeChecked();
    await btn(page, /Generate Policy Gap/, false).click();
    await expect(page.getByText('Life Cover Need')).toBeVisible();
  });

  await test.step('the profile stores every answer', async () => {
    const u = (await api(page, '/user/profile')).user;
    expect(u).toMatchObject({
      age: 29, income: 1800000, cityTier: 'Tier 2 (Emerging Metro)', occupation: 'Data Analyst', maritalStatus: 'Married',
      dependents: 2, spouseIncome: 900000, homeLoan: 3000000, otherLoans: 200000, monthlyExpenses: 55000, loanEmi: 32000,
      homeLoanYearsLeft: 12, existingLifeCover: 5000000, existingHealthCover: 300000, parentsHealthCover: 200000,
      existingCiCover: 1000000, existingPaCover: 2500000, onboardingCompleted: true,
    });
    expect(u.lifestyleRisks).toContain('Tobacco/Smoking');
  });

  await test.step('the strategy and screens reflect those answers', async () => {
    const s = (await api(page, '/strategy')).data;
    expect(s.life.liabilities).toBe(3200000);
    expect(s.life.educationCorpus).toBe(2500000); // one child under 22
    expect(s.life.annualIncomeReplaced).toBe(630000); // 70% of ₹18L less the partner's ₹6.3L take-home
    expect(s.household.parents).toBe(1);
    expect(s.affordability.annualEmi).toBe(384000);
    expect(s.criticalIllness.existing).toBe(1000000);
    expect(s.parentsHealth.existing).toBe(200000);
    expect(s.insights.some((i: { title: string }) => /Tobacco/.test(i.title))).toBe(true);
    await expect(page.getByText(inr(s.life.totalNeed)).first()).toBeVisible();

    await nav(page, 'Risk Sim');
    await page.getByRole('button', { name: /Total Disability/ }).first().click();
    await expect(page.getByText('Cover that pays out: ' + inr(2500000))).toBeVisible();

    await nav(page, 'Analysis');
    await expect(page.getByText("Parents' Health Cover")).toBeVisible();
    await expect(page.getByText(`${inr(s.parentsHealth.gap)} Gap`).first()).toBeVisible();

    await nav(page, 'Life Calc');
    await expect(page.getByText(inr(s.life.totalNeed)).first()).toBeVisible();
  });
});
