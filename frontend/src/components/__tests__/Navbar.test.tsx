import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Navbar } from '../Navbar';
import { AppContextProvider } from '@/lib/AppContext';
import { ThemeProvider } from '../theme-provider';

const renderNavbar = () =>
  render(
    <ThemeProvider defaultTheme="dark" storageKey="test-theme">
      <AppContextProvider>
        <Navbar />
      </AppContextProvider>
    </ThemeProvider>
  );

describe('mobile menu', () => {
  it('opens a list of every screen, moves focus into it, and closes on Escape back to the button', () => {
    renderNavbar();
    const toggle = screen.getByRole('button', { name: /^Menu/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const menu = document.getElementById('mobile-menu')!;
    expect(menu.querySelectorAll('button')).toHaveLength(12); // 11 screens + the language switch
    // Focus lands on the current screen's item, or the first item when the current screen isn't in the menu.
    expect(document.activeElement).toBe(menu.querySelector('[aria-current="page"]') ?? menu.querySelector('button'));

    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(document.getElementById('mobile-menu')).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

  it('closes after choosing a screen and shows the new one on the button', () => {
    renderNavbar();
    fireEvent.click(screen.getByRole('button', { name: /^Menu/ }));
    const menu = document.getElementById('mobile-menu')!;
    fireEvent.click([...menu.querySelectorAll('button')].find(b => b.textContent === 'Risk Sim')!);
    expect(document.getElementById('mobile-menu')).toBeNull();
    expect(screen.getByRole('button', { name: /^Menu/ })).toHaveTextContent('Risk Sim');
  });
});
