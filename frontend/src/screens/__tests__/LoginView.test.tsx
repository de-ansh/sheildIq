import { render, screen, fireEvent, act } from '@testing-library/react';
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
    await act(async () => {
      fireEvent.click(demoBtn);
    });
  });

  it('toggles sign-up mode and enforces password length', async () => {
    render(
      <AppContextProvider>
        <LoginView />
      </AppContextProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /^Sign Up$/i }));
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'short' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    });
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('shows the new-password form when opened from a reset link', () => {
    window.history.replaceState(null, '', '/?reset=' + 'a'.repeat(64));
    render(
      <AppContextProvider>
        <LoginView />
      </AppContextProvider>
    );
    expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Email Address/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Set New Password/i })).toBeInTheDocument();
    window.history.replaceState(null, '', '/');
  });

  it('switches to the forgot-password form', () => {
    render(
      <AppContextProvider>
        <LoginView />
      </AppContextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Forgot Password/i }));
    expect(screen.queryByLabelText(/^Password$/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Reset Link/i })).toBeInTheDocument();
  });
});
