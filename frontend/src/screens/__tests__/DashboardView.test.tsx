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
    expect(screen.getByText(/Target Income Cover/i)).toBeInTheDocument();
    expect(screen.getByText(/Coverage Gap/i)).toBeInTheDocument();
    expect(screen.getByText(/Risk Adequacy/i)).toBeInTheDocument();
    expect(screen.getByText(/Protection Strategy Overview/i)).toBeInTheDocument();
  });

  it('renders sidebar navigation items and user card', () => {
    render(
      <AppContextProvider>
        <DashboardView />
      </AppContextProvider>
    );

    expect(screen.getByText(/Coverage Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Policy Compare/i)).toBeInTheDocument();
    expect(screen.getByText(/Risk Simulator/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Alex Vance/i).length).toBeGreaterThan(0);
  });
});
