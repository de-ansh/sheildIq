import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mockApi } from '@/test/mockApi';
import { ComplianceView } from '../ComplianceView';
import { AppContextProvider } from '@/lib/AppContext';

describe('ComplianceView Component', () => {
  it('renders disclaimer header and table of contents', () => {
    render(
      <AppContextProvider>
        <ComplianceView />
      </AppContextProvider>
    );

    expect(screen.getByText(/Disclaimer & Compliance Disclosure/i)).toBeInTheDocument();
    expect(screen.getByText(/Table of Contents/i)).toBeInTheDocument();
    expect(screen.getByText(/01 Introduction & Scope/i)).toBeInTheDocument();
    expect(screen.getByText(/02 Data Sourcing & Formulae/i)).toBeInTheDocument();
    expect(screen.getByText(/04 Data Protection & Security/i)).toBeInTheDocument();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('saves the acknowledgement to the account and shows when it was accepted', async () => {
    const profile = { name: 'Priya Sharma', email: 'p@example.com', onboardingCompleted: false, disclaimerAcknowledgedAt: null };
    const fetchMock = mockApi({
      '/health': { status: 'UP' },
      '/user/profile': { success: true, user: profile },
      '/policies': { success: true, data: [] },
      '/user/disclaimer': { success: true, user: { ...profile, disclaimerAcknowledgedAt: '2026-10-16T10:00:00.000Z' } },
    });
    render(<AppContextProvider><ComplianceView /></AppContextProvider>);

    expect(screen.getByText(/Pending Acknowledgement/i)).toBeInTheDocument();
    const ackBtn = await screen.findByRole('button', { name: /Acknowledge & Accept Terms/i });
    await vi.waitFor(() => expect(ackBtn).toBeEnabled()); // enabled once signed in
    fireEvent.click(ackBtn);

    expect(await screen.findByText(/^Acknowledged$/i)).toBeInTheDocument();
    expect(screen.getByText(/Accepted on 16 October 2026/)).toBeInTheDocument();
    const calls = fetchMock.mock.calls as unknown as [RequestInfo, RequestInit | undefined][];
    expect(calls.some(([url, init]) => String(url).endsWith('/user/disclaimer') && init?.method === 'POST')).toBe(true);
  });

  it('asks signed-out visitors to sign in instead of pretending to record it', () => {
    render(<AppContextProvider><ComplianceView /></AppContextProvider>);
    expect(screen.getByRole('button', { name: /Acknowledge & Accept Terms/i })).toBeDisabled();
    expect(screen.getByText(/Sign in to record your acknowledgement/i)).toBeInTheDocument();
  });
});
