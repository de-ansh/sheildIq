import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LifeCalculatorView } from '../LifeCalculatorView';
import { AppContextProvider } from '@/lib/AppContext';

describe('LifeCalculatorView Component', () => {
  it('renders the Life Insurance Calculator header', () => {
    render(
      <AppContextProvider>
        <LifeCalculatorView />
      </AppContextProvider>
    );
    expect(screen.getByText(/Life Insurance Calculator/i)).toBeInTheDocument();
  });

  it('displays input fields for financial parameters', () => {
    render(
      <AppContextProvider>
        <LifeCalculatorView />
      </AppContextProvider>
    );
    expect(screen.getByText(/Financial Inputs/i)).toBeInTheDocument();
    expect(screen.getByText(/Annual Income \(Gross\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Years to Retirement/i)).toBeInTheDocument();
  });

  it('renders the connect with advisor call to action', () => {
    render(
      <AppContextProvider>
        <LifeCalculatorView />
      </AppContextProvider>
    );
    expect(screen.getByText(/Connect with Advisor/i)).toBeInTheDocument();
  });
});
