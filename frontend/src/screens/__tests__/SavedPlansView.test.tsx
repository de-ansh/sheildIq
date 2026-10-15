import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SavedPlansView } from '../SavedPlansView';
import { AppContextProvider } from '@/lib/AppContext';

describe('SavedPlansView Component', () => {
  it('renders saved plans archive header and currently deployed plan', () => {
    render(
      <AppContextProvider>
        <SavedPlansView />
      </AppContextProvider>
    );

    expect(screen.getByText(/Saved Plans & Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Currently Deployed/i)).toBeInTheDocument();
    expect(screen.getAllByText(/FY26 Core Comprehensive Portfolio/i).length).toBeGreaterThan(0);
  });

  it('renders plans catalog table and allows searching plans', () => {
    render(
      <AppContextProvider>
        <SavedPlansView />
      </AppContextProvider>
    );

    expect(screen.getByText(/Plan Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Plan ID/i)).toBeInTheDocument();
    expect(screen.getByText(/Status/i)).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search plans or IDs.../i);
    fireEvent.change(searchInput, { target: { value: 'Disability' } });
    expect(screen.getByText(/Disability & Trauma Shield v2/i)).toBeInTheDocument();
  });
});
