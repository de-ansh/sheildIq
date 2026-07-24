import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RiskSimulatorView } from '../RiskSimulatorView';

describe('RiskSimulatorView Component', () => {
  it('renders the risk simulator header and scenario selectors', () => {
    render(<RiskSimulatorView />);
    expect(screen.getByText(/Risk Simulator/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Early Death/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Critical Illness/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Total Disability/i).length).toBeGreaterThan(0);
  });

  it('renders risk stress test controls and treatment parameters', () => {
    render(<RiskSimulatorView />);
    expect(screen.getByText(/Stress Test Controls/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Treatment Cost/i).length).toBeGreaterThan(0);
  });
});
