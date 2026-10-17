import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardView } from '../DashboardView';
import { AppContextProvider } from '@/lib/AppContext';

describe('DashboardView Component', () => {
  it('renders analytical dashboard header and metrics', () => {
    render(
      <AppContextProvider>
        <DashboardView />
      </AppContextProvider>
    );

    expect(screen.getByText(/Analytical Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Life Cover Need/i)).toBeInTheDocument();
    expect(screen.getByText(/Coverage Gap/i)).toBeInTheDocument();
    expect(screen.getByText(/Risk Adequacy/i)).toBeInTheDocument();
    expect(screen.getByText(/Protection Strategy Overview/i)).toBeInTheDocument();
  });

  it('has no second navigation of its own (the top navbar is the only one)', () => {
    render(
      <AppContextProvider>
        <DashboardView />
      </AppContextProvider>
    );

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.queryByText(/Policy Compare/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Alex Vance/i).length).toBeGreaterThan(0);
  });
});
