import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { AppContextProvider } from '@/lib/AppContext';
import { AskShieldIQ } from '../AskShieldIQ';
import { ExplainResult } from '../ExplainResult';
import { OnboardingView } from '@/screens/OnboardingView';
import { PolicyAnalyzerView } from '@/screens/PolicyAnalyzerView';
import { mockApi } from '@/test/mockApi';

const user = {
  name: 'Priya Sharma', email: 'p@example.com', age: 34, income: 2400000, dependents: 2, maritalStatus: 'Married',
  city: 'Pune', cityTier: 'Tier 1 (Metro)', occupation: 'Engineer', homeLoan: 0, otherLoans: 0, monthlyExpenses: 80000,
  existingLifeCover: 10000000, existingHealthCover: 500000, liquidSavings: 0, spouseIncome: 0, dependentDetails: [], parentsHealthCover: 0,
  employerBenefits: [], lifestyleRisks: [], healthConditions: [], heightCm: 0, weightKg: 0, onboardingCompleted: true,
};

const signedIn = (extra: Record<string, unknown>, overrides: Partial<typeof user> = {}) =>
  mockApi({
    '/health': { status: 'UP', ai: 'gemini' },
    '/user/profile': { success: true, user: { ...user, ...overrides } },
    '/policies': { success: true, data: [] },
    '/strategy': { success: false, code: 'ONBOARDING_REQUIRED' },
    ...extra,
  });

const renderWithApp = (ui: React.ReactNode) => render(<AppContextProvider>{ui}</AppContextProvider>);

describe('AI features', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('Ask ShieldIQ loads saved history, streams the reply and shows follow-ups', async () => {
    const stream = (events: object[]) =>
      new Response(events.map(e => `data: ${JSON.stringify(e)}\n\n`).join(''), { headers: { 'Content-Type': 'text/event-stream' } });
    const fetchMock = signedIn({
      '/ai/chat': (init?: RequestInit) => init?.method === 'POST'
        ? stream([
          { delta: 'Close the life ' }, { delta: 'gap first.\n---\nHow much term cover?' },
          { done: true, reply: { answer: 'Close the life gap first.', suggestedQuestions: ['How much term cover?'] } },
        ])
        : { success: true, messages: [{ role: 'user', content: 'Earlier question', createdAt: '' }, { role: 'assistant', content: 'Earlier answer', createdAt: '' }] },
    });
    renderWithApp(<AskShieldIQ />);

    fireEvent.click(screen.getByRole('button', { name: /Ask ShieldIQ/i }));
    expect(await screen.findByText('Earlier answer')).toBeInTheDocument(); // survives a reload
    fireEvent.change(screen.getByLabelText(/Your question/i), { target: { value: 'What should I do first?' } });
    fireEvent.click(screen.getByRole('button', { name: /Send/i }));

    expect(await screen.findByText('Close the life gap first.')).toBeInTheDocument();
    expect(screen.queryByText(/---/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How much term cover?' })).toBeInTheDocument();
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit | undefined][];
    const chatCall = calls.find(([url, init]) => String(url).endsWith('/ai/chat') && init?.method === 'POST')!;
    expect(JSON.parse(String(chatCall[1]!.body))).toEqual({ message: 'What should I do first?' });
  });

  it('Ask ShieldIQ gives the question back when the answer fails', async () => {
    signedIn({
      '/ai/chat': (init?: RequestInit) => init?.method === 'POST'
        ? new Response(JSON.stringify({ success: false, error: 'Daily AI limit reached.' }), { status: 429 })
        : { success: true, messages: [] },
    });
    renderWithApp(<AskShieldIQ />);
    fireEvent.click(screen.getByRole('button', { name: /Ask ShieldIQ/i }));
    fireEvent.change(screen.getByLabelText(/Your question/i), { target: { value: 'Is my cover enough?' } });
    fireEvent.click(screen.getByRole('button', { name: /Send/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Daily AI limit reached.');
    expect(screen.getByLabelText(/Your question/i)).toHaveValue('Is my cover enough?');
    expect(screen.queryByText('Is my cover enough?', { selector: 'div' })).not.toBeInTheDocument();
  });

  it('describe-yourself fills onboarding fields for review', async () => {
    signedIn({
      '/ai/parse-profile': {
        success: true,
        draft: {
          age: 41, income: 3200000, maritalStatus: 'Married', dependents: 3, occupation: 'Doctor', cityTier: 'Tier 2 (Emerging Metro)',
          homeLoan: null, otherLoans: null, monthlyExpenses: null, existingLifeCover: null, existingHealthCover: null,
          liquidSavings: null, spouseIncome: null, parentsHealthCover: null,
          dependentDetails: [{ relation: 'child', age: 9 }, { relation: 'parent', age: null }],
          employerBenefits: [], lifestyleRisks: [], healthConditions: ['diabetes', 'flu'], notes: ['Assumed spouse is dependent.'],
        },
      },
    }, { onboardingCompleted: false, income: 0, occupation: '' });
    renderWithApp(<OnboardingView />);

    const box = await screen.findByLabelText(/Describe yourself instead/i);
    fireEvent.change(box, { target: { value: "I'm 41, a doctor in Nagpur earning 32 lakh, married with two kids." } });
    fireEvent.click(screen.getByRole('button', { name: /Fill In For Me/i }));

    expect(await screen.findByText('Assumed spouse is dependent.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Current Age/i)).toHaveValue(41);
    expect(screen.getByLabelText(/Annual Gross Income/i)).toHaveValue(3200000);
    expect(screen.getByLabelText(/Occupation/i)).toHaveValue('Doctor');
    // Dependents found by the AI land in the step-2 list; an unknown age stays blank for the user to fill.
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(screen.getByLabelText(/Relationship of dependent 2/i)).toHaveValue('parent');
    expect(screen.getByLabelText(/Age of dependent 1/i)).toHaveValue(9);
    expect(screen.getByLabelText(/Age of dependent 2/i)).toHaveValue(null);
  });

  it('policy analyzer rejects non-PDFs on the device and shows results for a PDF', async () => {
    const fetchMock = signedIn({
      '/ai/policy-analysis': {
        success: true,
        analysis: {
          isInsurancePolicy: true, policyName: 'SecureCare', insurer: 'Example General', policyType: 'health', sumAssured: 1000000,
          annualPremium: 21450, policyTermYears: 1, plainSummary: 'Family floater covering hospitalisation.', keyBenefits: ['Day care'],
          exclusions: ['Cosmetic surgery'], waitingPeriods: ['Pre-existing diseases: 24 months'], subLimits: ['Room rent 1% of SI'],
          redFlags: ['Room rent cap can cause proportionate deductions.'],
        },
        fit: { category: 'health', gap: 1000000, coversPct: 100, remainingGap: 0, summary: 'If this is new cover, it closes your ₹10.0L health gap.' },
      },
    });
    renderWithApp(<PolicyAnalyzerView />);
    const input = (await screen.findByText(/Upload Policy/i)).closest('div')!.parentElement!.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [new File(['hello'], 'notes.txt', { type: 'text/plain' })] } });
    expect(await screen.findByText(/Please choose a PDF file/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('policy-analysis'))).toBe(false);

    fireEvent.change(input, { target: { files: [new File(['%PDF-1.4 test'], 'policy.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByText('SecureCare')).toBeInTheDocument();
    expect(screen.getByText(/closes your ₹10.0L health gap/)).toBeInTheDocument();
    expect(screen.getByText(/Room rent cap can cause/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add ₹10.0L to My Cover/i })).toBeDisabled();
  });

  it('explain marks the explanation stale when inputs change', async () => {
    signedIn({ '/ai/explain': { success: true, explanation: { summary: 'Income replacement dominates.', drivers: [{ factor: 'Income', effect: 'Biggest share' }], whatIfs: [] } } });
    const Harness = () => {
      const [income, setIncome] = React.useState(1);
      return (
        <>
          <button onClick={() => setIncome(5)}>change input</button>
          <ExplainResult screen="life-calculator" inputs={{ income }} result={{ cover: 2 }} />
        </>
      );
    };
    renderWithApp(<Harness />);

    fireEvent.click(await screen.findByRole('button', { name: /Explain This Result/i }));
    expect(await screen.findByText('Income replacement dominates.')).toBeInTheDocument();
    expect(screen.queryByText(/Inputs changed since this explanation/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'change input' }));
    expect(screen.getByText(/Inputs changed since this explanation/i)).toBeInTheDocument();
  });
});
