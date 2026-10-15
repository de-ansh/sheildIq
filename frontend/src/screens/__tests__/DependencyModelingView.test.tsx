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

    expect(screen.getByText(/Dependency Modeling/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Lifetime Liability/i)).toBeInTheDocument();
    expect(screen.getByText(/Peak Pressure Year/i)).toBeInTheDocument();
  });

  it('renders dependency heatmap and scenario assumptions controls', () => {
    render(
      <AppContextProvider>
        <DependencyModelingView />
      </AppContextProvider>
    );

    expect(screen.getByText(/Dependency Heatmap/i)).toBeInTheDocument();
    expect(screen.getByText(/Higher Education Fund/i)).toBeInTheDocument();
    expect(screen.getByText(/Spouse Income Replacement/i)).toBeInTheDocument();
    expect(screen.getByText(/Scenario Assumptions/i)).toBeInTheDocument();
    expect(screen.getByText(/Projected General Inflation/i)).toBeInTheDocument();
  });
});
