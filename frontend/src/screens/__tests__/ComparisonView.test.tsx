import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ComparisonView } from '../ComparisonView';
import { AppContextProvider } from '@/lib/AppContext';
import { mockApi } from '@/test/mockApi';

const option = (id: string, name: string, premium: number, recommended = false) => ({
  id, type: 'x', name, insurer: 'Most life insurers', structure: `${name} structure`, features: [`${name} feature`], tradeOffs: [`${name} trade-off`],
  exclusions: [], waitingPeriod: 'None', clarityScore: 90, bestFor: 'Families', cover: 27000000,
  annualPremium: premium, monthlyPremium: Math.round(premium / 12), note: null, recommended,
});
const type = (t: string, label: string, names: string[], pick: number) => ({
  type: t, label, cover: 27000000, coverRationale: `${label} rationale`, recommendedId: `${t}-${pick}`, recommendationReason: `${label} reason`,
  options: names.map((n, i) => ({ ...option(`${t}-${i}`, n, 40000 + i * 10000, i === pick), type: t })),
});

describe('ComparisonView plan options', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows four options per insurance type with the recommendation highlighted', async () => {
    mockApi({
      '/health': { status: 'UP' },
      '/user/profile': { success: true, user: { name: 'A', email: 'a@x.com', onboardingCompleted: true, maritalStatus: 'Married', age: 34, cityTier: 'Tier 1 (Metro)' } },
      '/policies': { success: true, data: [] },
      '/strategy': { success: false },
      '/plan-options': {
        success: true,
        disclaimer: 'Plan types with indicative premiums, not insurer quotes.',
        insurerRecords: {
          source: { period: 'FY 2024-25', threeYearPeriod: 'FY 2022-23 to 2024-25', publisher: 'IRDAI', documents: 'Handbook 2024-25', url: 'https://irdai.gov.in/handbook-of-indian-insurance' },
          life: [
            { insurer: 'Axis Max Life', claimsHandled: 20225, paidByNumberPct: 99.7, paidByAmountPct: 97.39, settledWithin30DaysPct: 94.4, complaintsPer10kPolicies: 9.2, solvencyRatio: 2.01, offices: 404, threeYear: { paidByAmountPct: 96.2, paidByNumberPct: 99.4 }, score: 81, rank: 1, strengths: [{ id: 'claimsPaid', value: 99.5 }, { id: 'solvency', value: 2.01 }], watchOut: null },
            { insurer: 'Shriram Life', claimsHandled: 4852, paidByNumberPct: 98.31, paidByAmountPct: 81.71, settledWithin30DaysPct: 100, complaintsPer10kPolicies: 16.4, solvencyRatio: 1.79, offices: 537, threeYear: { paidByAmountPct: 79.9, paidByNumberPct: 98.2 }, score: 59, rank: 2, strengths: [{ id: 'claimsPaid', value: 99.5 }, { id: 'solvency', value: 2.01 }], watchOut: { id: 'claimValuePaid', value: 79.9 } },
            { insurer: 'Bharti AXA Life', claimsHandled: 2085, paidByNumberPct: 99.18, paidByAmountPct: 98.41, settledWithin30DaysPct: 94, complaintsPer10kPolicies: 51.8, solvencyRatio: 1.67, offices: 212, threeYear: { paidByAmountPct: 97.6, paidByNumberPct: 99.1 }, score: 43, rank: 3, strengths: [{ id: 'claimsPaid', value: 99.5 }, { id: 'solvency', value: 2.01 }], watchOut: { id: 'complaints', value: 44.8 } },
          ],
          health: [{ insurer: 'Care Health', claimsHandled: 1508929, paidPct: 95.19, repudiatedPct: 3.1, incurredClaimsRatioPct: 64.53, complaintsPer10kPolicies: 37.3, solvencyRatio: 1.68, offices: 269, threeYear: { paidPct: 89.5, repudiatedPct: 5.8 }, score: 66, rank: 1, strengths: [{ id: 'claimsPaid', value: 99.5 }, { id: 'solvency', value: 2.01 }], watchOut: null }],
          adjustments: ['largeCover', 'parents'],
          generalHealth: [
            { insurer: 'HDFC ERGO', retailHealthPremiumCr: 2339, retailClaimsRatioPct: 89.9, retailClaimsRatioPct3y: 85.1, solvencyRatio: 2.0, offices: 299, governmentOwned: false },
            { insurer: 'Oriental Insurance', retailHealthPremiumCr: 1599, retailClaimsRatioPct: 106.6, retailClaimsRatioPct3y: 104.7, solvencyRatio: -1.03, offices: 1049, governmentOwned: true },
          ],
        },
        data: [
          type('term_life', 'Term Life', ['Pure Level Term', 'Term + Riders', 'Increasing Cover', 'Return of Premium'], 1),
          type('health', 'Health', ['Family Floater', 'Base + Top-Up', 'Comprehensive', 'Top-Up Only'], 3),
          type('critical_illness', 'Critical Illness', ['Lump-Sum CI', 'Multi-Claim CI', 'CI Rider', 'Cancer & Heart'], 0),
          type('personal_accident', 'Personal Accident', ['Basic PA', 'PA + Income', 'PA Rider', 'Comprehensive PA'], 0),
        ],
      },
    });
    render(<AppContextProvider><ComparisonView /></AppContextProvider>);

    expect(await screen.findByText('Term Life reason')).toBeInTheDocument();
    expect(screen.getAllByRole('tab', { name: /Term Life|Health|Critical Illness|Personal Accident/ })).toHaveLength(4);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(6); // 4 option cards + the shortlist + the claim records panel
    const recommendedCard = screen.getByText('Recommended for you').closest('div.p-5')!;
    expect(within(recommendedCard as HTMLElement).getByRole('heading', { name: 'Term + Riders' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Term Life options compared/ })).toBeInTheDocument();
    // Official claim records for life insurers; a low by-amount figure is highlighted.
    const life = screen.getByRole('table', { name: /Life insurers' claim and service records, FY 2024-25/ });
    expect(within(life).getByRole('row', { name: /Axis Max Life 81 99.70% 97.39% 94.4% 9.2 2.01 404/ })).toBeInTheDocument();
    expect(within(life).getByText('81.71%')).toHaveClass('text-amber-700');
    // Service weak spots: complaints over twice the median (16.4) and solvency close to IRDAI's 1.5 minimum.
    expect(within(life).getByText('51.8')).toHaveClass('text-amber-700');
    expect(within(life).getByText('9.2')).not.toHaveClass('text-amber-700');
    expect(within(life).getByText('1.67')).toHaveClass('text-amber-700');
    expect(within(life).getByText('2.01')).not.toHaveClass('text-amber-700');
    // Top 3 shortlist in ranked order, with strengths, watch-outs and why the weights changed for this household.
    const shortlist = screen.getByRole('heading', { name: 'Top 3 life insurers for you' }).closest('div.p-6') as HTMLElement;
    const picks = within(shortlist).getAllByRole('listitem').filter(li => li.parentElement?.tagName === 'OL');
    expect(picks.map(li => li.textContent)).toEqual([
      // Claim figures always shown; a strength already in them isn't repeated.
      '1. Axis Max Life81/100Paid 96.2% of claim value, 99.4% of claimsSolvency 2.01 (IRDAI minimum 1.5)',
      '2. Shriram Life59/100Paid 79.9% of claim value, 98.2% of claimsSolvency 2.01 (IRDAI minimum 1.5)Watch out: Paid 79.9% of claim value',
      '3. Bharti AXA Life43/100Paid 97.6% of claim value, 99.1% of claimsSolvency 2.01 (IRDAI minimum 1.5)Watch out: 44.8 complaints per 10,000 policies',
    ]);
    expect(within(shortlist).getByText(/cover need is over ₹1 Cr/)).toBeInTheDocument();
    expect(within(shortlist).queryByText(/You cover parents/)).toBeNull(); // a health-only adjustment
    expect(within(shortlist).getByText(/not advice to buy from a particular insurer/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'irdai.gov.in' })).toHaveAttribute('href', 'https://irdai.gov.in/handbook-of-indian-insurance');

    fireEvent.click(screen.getByRole('tab', { name: /Health/ }));
    expect(screen.getByText('Health reason')).toBeInTheDocument();
    const healthPick = screen.getByText('Recommended for you').closest('div.p-5')!;
    expect(within(healthPick as HTMLElement).getByRole('heading', { name: 'Top-Up Only' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Health insurers' claim and service records/ })).toBeInTheDocument();
    // General insurers: separate, unranked, with weak spots flagged (claims ratio over 100%, solvency below 1.5).
    const general = screen.getByRole('table', { name: /General insurers' retail health business/ });
    expect(within(general).getByRole('row', { name: /HDFC ERGO Private ₹2,339 Cr 89.9% 85.1% 2.00 299/ })).toBeInTheDocument();
    expect(within(general).getByText('106.6%')).toHaveClass('text-amber-700');
    expect(within(general).getByText('-1.03')).toHaveClass('text-amber-700');
    expect(within(general).getByText('89.9%')).not.toHaveClass('text-amber-700');
    expect(screen.getByText(/not insurer quotes/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Critical Illness/ }));
    expect(screen.getByText(/IRDAI does not publish insurer-wise critical illness figures/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /As a rider on a term plan/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /As a standalone policy/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Personal Accident/ }));
    expect(screen.getByText(/doesn't rank insurers for it/)).toBeInTheDocument();
  });
});
