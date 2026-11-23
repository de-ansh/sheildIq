import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SettingsView } from '../SettingsView';
import { AppContextProvider } from '@/lib/AppContext';

const renderView = () => render(<AppContextProvider><SettingsView /></AppContextProvider>);

describe('SettingsView Component', () => {
  it('renders settings tabs and identity form fields', () => {
    renderView();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Personal Details/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Household & City/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Security & Privacy/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Annual Gross Income/i)).toBeInTheDocument();
  });

  it('shows Save on the profile tabs and not on the security tab, where it would do nothing', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /Household & City/i }));
    expect(screen.getByLabelText('Age')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Security & Privacy/i }));
    expect(screen.getByRole('button', { name: /Update Password/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Changes/i })).toBeNull();
  });
});
