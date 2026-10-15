import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SystemStatesView } from '../SystemStatesView';
import { AppContextProvider } from '@/lib/AppContext';

describe('SystemStatesView Component', () => {
  it('renders default maintenance state and state switcher buttons', () => {
    render(
      <AppContextProvider>
        <SystemStatesView />
      </AppContextProvider>
    );

    expect(screen.getByText(/Periodic Model Calibration/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^loading$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^error$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^empty$/i })).toBeInTheDocument();
  });

  it('allows toggling between system states interactively', () => {
    render(
      <AppContextProvider>
        <SystemStatesView />
      </AppContextProvider>
    );

    // Switch to error state
    const errorBtn = screen.getByRole('button', { name: /^error$/i });
    fireEvent.click(errorBtn);
    expect(screen.getByText(/Model Calculation Failure/i)).toBeInTheDocument();

    // Switch to empty state
    const emptyBtn = screen.getByRole('button', { name: /^empty$/i });
    fireEvent.click(emptyBtn);
    expect(screen.getByText(/No Records Found/i)).toBeInTheDocument();

    // Switch to loading state
    const loadingBtn = screen.getByRole('button', { name: /^loading$/i });
    fireEvent.click(loadingBtn);
    expect(screen.getByText(/Processing Actuarial Data/i)).toBeInTheDocument();
  });
});
