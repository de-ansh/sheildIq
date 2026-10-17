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
          source: { period: 'FY 2024-25', publisher: 'IRDAI', documents: 'Handbook 2024-25', url: 'https://irdai.gov.in/handbook-of-indian-insurance' },
          life: [
            { insurer: 'Axis Max Life', claimsHandled: 20225, paidByNumberPct: 99.7, paidByAmountPct: 97.39, settledWithin30DaysPct: 94.4, complaintsPer10kPolicies: 9.2, solvencyRatio: 2.01, offices: 404 },
            { insurer: 'Shriram Life', claimsHandled: 4852, paidByNumberPct: 98.31, paidByAmountPct: 81.71, settledWithin30DaysPct: 100, complaintsPer10kPolicies: 16.4, solvencyRatio: 1.79, offices: 537 },
            { insurer: 'Bharti AXA Life', claimsHandled: 2085, paidByNumberPct: 99.18, paidByAmountPct: 98.41, settledWithin30DaysPct: 94, complaintsPer10kPolicies: 51.8, solvencyRatio: 1.67, offices: 212 },
          ],
          health: [{ insurer: 'Care Health', claimsHandled: 1508929, paidPct: 95.19, repudiatedPct: 3.1, incurredClaimsRatioPct: 64.53, complaintsPer10kPolicies: 37.3, solvencyRatio: 1.68, offices: 269 }],
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
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5); // 4 option cards + the claim records panel
    const recommendedCard = screen.getByText('Recommended for you').closest('div.p-5')!;
    expect(within(recommendedCard as HTMLElement).getByRole('heading', { name: 'Term + Riders' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Term Life options compared/ })).toBeInTheDocument();
    // Official claim records for life insurers; a low by-amount figure is highlighted.
    const life = screen.getByRole('table', { name: /Life insurers' claim and service records, FY 2024-25/ });
    expect(within(life).getByRole('row', { name: /Axis Max Life 99.70% 97.39% 94.4% 9.2 2.01 404/ })).toBeInTheDocument();
    expect(within(life).getByText('81.71%')).toHaveClass('text-amber-700');
    // Service weak spots: complaints over twice the median (16.4) and solvency close to IRDAI's 1.5 minimum.
    expect(within(life).getByText('51.8')).toHaveClass('text-amber-700');
    expect(within(life).getByText('9.2')).not.toHaveClass('text-amber-700');
    expect(within(life).getByText('1.67')).toHaveClass('text-amber-700');
    expect(within(life).getByText('2.01')).not.toHaveClass('text-amber-700');
    expect(screen.getByRole('link', { name: 'irdai.gov.in' })).toHaveAttribute('href', 'https://irdai.gov.in/handbook-of-indian-insurance');

    fireEvent.click(screen.getByRole('tab', { name: /Health/ }));
    expect(screen.getByText('Health reason')).toBeInTheDocument();
    const healthPick = screen.getByText('Recommended for you').closest('div.p-5')!;
    expect(within(healthPick as HTMLElement).getByRole('heading', { name: 'Top-Up Only' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Health insurers' claim and service records/ })).toBeInTheDocument();
    expect(screen.getByText(/not insurer quotes/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Critical Illness/ }));
    expect(screen.getByText(/IRDAI does not publish insurer-wise claim figures for critical illness/)).toBeInTheDocument();
  });
});
