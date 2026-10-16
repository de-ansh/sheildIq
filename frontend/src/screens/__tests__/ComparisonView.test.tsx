import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ComparisonView } from '../ComparisonView';
import { AppContextProvider } from '@/lib/AppContext';
import { mockApi } from '@/test/mockApi';

const option = (id: string, name: string, premium: number, recommended = false) => ({
  id, type: 'x', name, insurer: 'Sample Life (sample)', structure: `${name} structure`, features: [`${name} feature`], tradeOffs: [`${name} trade-off`],
  exclusions: [], waitingPeriod: 'None', claimSettlementRatio: 98, clarityScore: 90, bestFor: 'Families', cover: 27000000,
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
        disclaimer: 'Sample plans; insurer names are illustrative.',
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
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
    const recommendedCard = screen.getByText('Recommended for you').closest('div.p-5')!;
    expect(within(recommendedCard as HTMLElement).getByRole('heading', { name: 'Term + Riders' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Term Life options compared/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Health/ }));
    expect(screen.getByText('Health reason')).toBeInTheDocument();
    const healthPick = screen.getByText('Recommended for you').closest('div.p-5')!;
    expect(within(healthPick as HTMLElement).getByRole('heading', { name: 'Top-Up Only' })).toBeInTheDocument();
    expect(screen.getByText(/insurer names are illustrative/)).toBeInTheDocument();
  });
});
