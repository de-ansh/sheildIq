import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoginView } from '../LoginView';
import { AppContextProvider } from '@/lib/AppContext';

describe('LoginView Component', () => {
  it('renders login form elements and branding', () => {
    render(
      <AppContextProvider>
        <LoginView />
      </AppContextProvider>
    );

    expect(screen.getAllByText(/ShieldIQ/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Risk-Intelligent Protection Planning/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/name@company.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sign In$/i })).toBeInTheDocument();
    expect(screen.getByText(/One-Click Demo Sign-In/i)).toBeInTheDocument();
  });

  it('allows user to enter credentials and click demo sign-in', async () => {
    render(
      <AppContextProvider>
        <LoginView />
      </AppContextProvider>
    );

    const emailInput = screen.getByPlaceholderText(/name@company.com/i);
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    expect(emailInput).toHaveValue('user@example.com');

    const demoBtn = screen.getByText(/One-Click Demo Sign-In/i);
    fireEvent.click(demoBtn);
  });
});
