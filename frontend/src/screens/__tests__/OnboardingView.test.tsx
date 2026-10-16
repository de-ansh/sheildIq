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
    // The default profile predates the dependents list: its child is pre-filled and needs an age before continuing.
    const step2ContinueBtn = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(step2ContinueBtn);
    expect(screen.getByText(/Enter each dependent's age/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Relationship of dependent 1/i)).toHaveValue('child');
    fireEvent.change(screen.getByLabelText(/Age of dependent 1/i), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(screen.getByText(/Protection & Lifestyle/i)).toBeInTheDocument();
  });
});
