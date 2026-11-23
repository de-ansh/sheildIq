import { render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { mockApi } from '@/test/mockApi';
import { SystemStatesView } from '../SystemStatesView';
import { AppContextProvider } from '@/lib/AppContext';

const renderView = () => render(<AppContextProvider><SystemStatesView /></AppContextProvider>);

describe('SystemStatesView', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the live backend status', async () => {
    mockApi({ '/health': { status: 'UP', version: '1.0.0', timestamp: '2026-10-16T10:00:00.000Z' } });
    renderView();
    expect(await screen.findByText(/All Systems Operational/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.0\.0 is up/)).toBeInTheDocument();
  });

  it('says the service is unreachable when the health check fails', async () => {
    mockApi({ '/health': { status: 'DOWN' } });
    renderView();
    expect(await screen.findByText(/Service Unreachable/i)).toBeInTheDocument();
  });
});
