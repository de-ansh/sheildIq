import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { OnboardingView } from '../OnboardingView';

describe('OnboardingView Component', () => {
  it('renders step 1 of the onboarding wizard', () => {
    render(<OnboardingView />);
    expect(screen.getByText(/Personal Information/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();
  });

  it('renders progress tracker and brand logo', () => {
    render(<OnboardingView />);
    expect(screen.getAllByText(/ShieldIQ/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Continue/i)).toBeInTheDocument();
  });
});
