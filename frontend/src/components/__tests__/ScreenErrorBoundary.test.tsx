import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScreenErrorBoundary } from '../ScreenErrorBoundary';

const Broken = () => {
  throw new Error("Cannot read properties of undefined (reading 'toFixed')");
};

describe('ScreenErrorBoundary', () => {
  it('shows a way back instead of a blank page when a screen crashes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onHome = vi.fn();
    render(<ScreenErrorBoundary onHome={onHome}><Broken /></ScreenErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent("This screen couldn't load");
    fireEvent.click(screen.getByRole('button', { name: 'Go to Dashboard' }));
    expect(onHome).toHaveBeenCalled();
  });

  it('renders the screen normally when nothing fails', () => {
    render(<ScreenErrorBoundary onHome={() => {}}><p>Plan Options</p></ScreenErrorBoundary>);
    expect(screen.getByText('Plan Options')).toBeInTheDocument();
  });
});
