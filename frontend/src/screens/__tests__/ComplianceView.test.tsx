import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ComplianceView } from '../ComplianceView';
import { AppContextProvider } from '@/lib/AppContext';

describe('ComplianceView Component', () => {
  it('renders disclaimer header and table of contents', () => {
    render(
      <AppContextProvider>
        <ComplianceView />
      </AppContextProvider>
    );

    expect(screen.getByText(/Disclaimer & Compliance Disclosure/i)).toBeInTheDocument();
    expect(screen.getByText(/Table of Contents/i)).toBeInTheDocument();
    expect(screen.getByText(/01 Introduction & Scope/i)).toBeInTheDocument();
    expect(screen.getByText(/02 Data Sourcing & Formulae/i)).toBeInTheDocument();
    expect(screen.getByText(/04 Data Protection & Security/i)).toBeInTheDocument();
  });

  it('allows user to acknowledge terms and updates status badge', () => {
    render(
      <AppContextProvider>
        <ComplianceView />
      </AppContextProvider>
    );

    expect(screen.getByText(/Pending Acknowledgement/i)).toBeInTheDocument();
    const ackBtn = screen.getByRole('button', { name: /Acknowledge & Accept Terms/i });
    fireEvent.click(ackBtn);

    expect(screen.getByText(/^Acknowledged$/i)).toBeInTheDocument();
  });
});
