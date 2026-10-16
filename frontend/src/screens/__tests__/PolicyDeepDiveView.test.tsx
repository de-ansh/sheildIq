import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { PolicyDeepDiveView } from '../PolicyDeepDiveView';
import { AppContextProvider } from '@/lib/AppContext';
import { mockApi } from '@/test/mockApi';

const policy = (id: string, title: string, category: string) => ({
  id, title, provider: 'Most life insurers', category, coverageAmount: 1500000, monthlyPremium: 1200,
  clarityScore: 90, status: 'Available', features: [`${title} feature`], exclusions: [`${title} exclusion`],
  structure: `${title} structure`, waitingPeriod: '30 days', bestFor: 'Families',
});

const catalog = () =>
  mockApi({
    '/health': { status: 'UP' },
    '/policies': {
      success: true,
      data: [
        policy('TL-BASIC', 'Pure Level Term', 'Life'), policy('TL-RIDERS', 'Term + Riders', 'Life'),
        policy('HL-FLOATER', 'Family Floater', 'Health'), policy('HL-COMPREHENSIVE', 'Comprehensive Floater', 'Health'),
      ],
    },
  });

describe('PolicyDeepDiveView Component', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders the first catalog plan with its fine print', async () => {
    catalog();
    render(<AppContextProvider><PolicyDeepDiveView /></AppContextProvider>);
    expect(await screen.findByRole('heading', { name: 'Pure Level Term' })).toBeInTheDocument();
    expect(screen.getAllByText(/Sum Assured/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Benefit Structural Analysis/i)).toBeInTheDocument();
    expect(screen.getByText('Pure Level Term exclusion')).toBeInTheDocument();
    expect(screen.getByText(/Compliance Score/i)).toBeInTheDocument();
  });

  it('switches by cover type, then by plan within the type', async () => {
    catalog();
    render(<AppContextProvider><PolicyDeepDiveView /></AppContextProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Health' }));
    expect(screen.getByRole('heading', { name: 'Family Floater' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Term + Riders' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Comprehensive Floater' }));
    expect(screen.getByRole('heading', { name: 'Comprehensive Floater' })).toBeInTheDocument();
  });
});
