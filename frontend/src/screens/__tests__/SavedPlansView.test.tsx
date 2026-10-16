import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { SavedPlansView } from '../SavedPlansView';
import { AppContextProvider } from '@/lib/AppContext';
import { toCsv } from '@/lib/utils';
import { mockApi } from '@/test/mockApi';
import type { SavedPlan } from '@/lib/api';

const plan = (id: string, name: string, status: SavedPlan['status'] = 'Adequate'): SavedPlan => ({
  id, name, category: 'Term Life', coverageAmount: 15000000, monthlyPremium: 1200, status, lastModified: '2026-10-01', description: 'd',
});

const loggedIn = (plans: SavedPlan[]) =>
  mockApi({
    '/health': { status: 'UP' },
    '/user/profile': { success: true, user: { name: 'Priya Sharma', email: 'p@example.com', onboardingCompleted: false } },
    '/policies': { success: true, data: [] },
    '/plans': { success: true, data: plans },
  });

describe('SavedPlansView Component', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads the signed-in user\'s plans from the API', async () => {
    loggedIn([plan('SIQ-1', 'Family Term Plan'), plan('SIQ-2', 'Disability Shield v2', 'Gap Detected')]);
    render(<AppContextProvider><SavedPlansView /></AppContextProvider>);

    expect(screen.getByText(/Saved Plans & Reports/i)).toBeInTheDocument();
    expect(await screen.findByText(/Most Recent/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Family Term Plan/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹1.50 Cr/).length).toBeGreaterThan(0);
  });

  it('filters plans by search text', async () => {
    loggedIn([plan('SIQ-1', 'Family Term Plan'), plan('SIQ-2', 'Disability Shield v2')]);
    render(<AppContextProvider><SavedPlansView /></AppContextProvider>);
    await screen.findByText(/Most Recent/i);

    fireEvent.change(screen.getByPlaceholderText(/Search plans or IDs.../i), { target: { value: 'Disability' } });
    expect(screen.getByText(/Disability Shield v2/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Family Term Plan/i)).toHaveLength(1); // only the "Most Recent" card, not the table row
  });

  it('exports CSV with quoting and formula-injection protection', () => {
    const csv = toCsv([plan('SIQ-1', '=HYPERLINK("http://evil")'), plan('SIQ-2', 'Plan, "quoted"')]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('"Coverage (INR)"');
    expect(lines[1]).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(lines[2]).toContain('"Plan, ""quoted"""');
  });
});
