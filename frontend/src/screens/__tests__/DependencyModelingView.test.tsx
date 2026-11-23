import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DependencyModelingView } from '../DependencyModelingView';
import { AppContextProvider } from '@/lib/AppContext';

describe('DependencyModelingView Component', () => {
  it('renders dependency modeling header and lifetime liability', () => {
    render(
      <AppContextProvider>
        <DependencyModelingView />
      </AppContextProvider>
    );

    expect(screen.getByText(/If You Weren't There/i)).toBeInTheDocument();
    expect(screen.getByText(/Obligations Before Savings/i)).toBeInTheDocument();
    expect(screen.getByText(/Peak Pressure Year/i)).toBeInTheDocument();
  });

  it('renders dependency heatmap and scenario assumptions controls', () => {
    render(
      <AppContextProvider>
        <DependencyModelingView />
      </AppContextProvider>
    );

    expect(screen.getByText(/Year by Year/i)).toBeInTheDocument();
    expect(screen.getByText(/Higher Education Fund/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Income Replacement' })).toBeInTheDocument();
    expect(screen.getByText(/Scenario Assumptions/i)).toBeInTheDocument();
    expect(screen.getByText(/Projected General Inflation/i)).toBeInTheDocument();
  });
});
