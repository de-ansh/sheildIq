import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { OnboardingView } from '../OnboardingView';
import { AppContextProvider } from '@/lib/AppContext';

describe('OnboardingView Component', () => {
  it('renders step 1 of the onboarding wizard', () => {
    render(
      <AppContextProvider>
        <OnboardingView />
      </AppContextProvider>
    );
    expect(screen.getByText(/Personal Information/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();
  });

  it('renders progress tracker and allows navigating steps', () => {
    render(
      <AppContextProvider>
        <OnboardingView />
      </AppContextProvider>
    );
    expect(screen.getAllByText(/ShieldIQ/i).length).toBeGreaterThan(0);

    const continueBtn = screen.getByRole('button', { name: /Continue/i });
    expect(continueBtn).toBeInTheDocument();

    // Advance to step 2
    fireEvent.click(continueBtn);
    expect(screen.getByText(/Family & Liabilities/i)).toBeInTheDocument();

    // Advance to step 3
    const step2ContinueBtn = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(step2ContinueBtn);
    expect(screen.getByText(/Protection & Lifestyle/i)).toBeInTheDocument();
  });
});
