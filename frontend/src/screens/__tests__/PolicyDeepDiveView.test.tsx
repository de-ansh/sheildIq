import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PolicyDeepDiveView } from '../PolicyDeepDiveView';
import { AppContextProvider } from '@/lib/AppContext';

describe('PolicyDeepDiveView Component', () => {
  it('renders policy details and inclusions/exclusions dynamically', () => {
    render(
      <AppContextProvider>
        <PolicyDeepDiveView />
      </AppContextProvider>
    );

    expect(screen.getAllByText(/OmniShield Premium Life/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sum Assured/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Benefit Structural Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Inclusions & Features/i)).toBeInTheDocument();
    expect(screen.getByText(/Exclusion Clauses/i)).toBeInTheDocument();
    expect(screen.getByText(/Compliance Score/i)).toBeInTheDocument();
  });

  it('allows switching between policies in the portfolio', () => {
    render(
      <AppContextProvider>
        <PolicyDeepDiveView />
      </AppContextProvider>
    );

    const switchBtn = screen.getByRole('button', { name: /Executive Health Safeguard/i });
    expect(switchBtn).toBeInTheDocument();
    fireEvent.click(switchBtn);

    expect(screen.getAllByText(/Executive Health Safeguard/i).length).toBeGreaterThan(0);
  });
});
