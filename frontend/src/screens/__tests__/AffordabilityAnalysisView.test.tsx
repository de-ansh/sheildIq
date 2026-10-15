import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AffordabilityAnalysisView } from '../AffordabilityAnalysisView';
import { AppContextProvider } from '@/lib/AppContext';

describe('AffordabilityAnalysisView Component', () => {
  it('renders affordability analysis header and primary metrics', () => {
    render(
      <AppContextProvider>
        <AffordabilityAnalysisView />
      </AppContextProvider>
    );

    expect(screen.getByText(/Affordability Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Premium-to-Income/i)).toBeInTheDocument();
    expect(screen.getByText(/Debt-to-Premium/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly Premium/i)).toBeInTheDocument();
    expect(screen.getByText(/Sustainability Tier/i)).toBeInTheDocument();
  });

  it('renders sustainability zones and AI optimizer recommendations', () => {
    render(
      <AppContextProvider>
        <AffordabilityAnalysisView />
      </AppContextProvider>
    );

    expect(screen.getByText(/Sustainability Zones/i)).toBeInTheDocument();
    expect(screen.getByText(/Projected Escalation/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Optimizer/i)).toBeInTheDocument();
    expect(screen.getByText(/Deductible Shift/i)).toBeInTheDocument();
  });
});
