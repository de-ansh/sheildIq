import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SettingsView } from '../SettingsView';
import { AppContextProvider } from '@/lib/AppContext';

describe('SettingsView Component', () => {
  it('renders settings tabs and identity form fields', () => {
    render(
      <AppContextProvider>
        <SettingsView />
      </AppContextProvider>
    );

    expect(screen.getByText(/Platform Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Personal Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Regional & Baseline/i)).toBeInTheDocument();
    expect(screen.getByText(/Security & Privacy/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Annual Gross Income/i)).toBeInTheDocument();
  });

  it('allows switching tabs and submitting updated preferences', () => {
    render(
      <AppContextProvider>
        <SettingsView />
      </AppContextProvider>
    );

    // Switch to Regional tab
    const regionalTab = screen.getByRole('button', { name: /Regional & Baseline/i });
    fireEvent.click(regionalTab);
    expect(screen.getByText(/Regional Settings & Currency/i)).toBeInTheDocument();

    // Switch to Security tab
    const securityTab = screen.getByRole('button', { name: /Security & Privacy/i });
    fireEvent.click(securityTab);
    expect(screen.getByText(/Two-Factor Authentication/i)).toBeInTheDocument();

    // Submit form
    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);
  });
});
