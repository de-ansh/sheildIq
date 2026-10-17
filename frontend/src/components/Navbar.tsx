import React, { useEffect, useRef, useState } from 'react';
import { useApp, ScreenId } from '../lib/AppContext';
import { useTheme } from './theme-provider';
import { Button } from './ui/button';
import {
  Shield,
  LayoutDashboard,
  ArrowRightLeft,
  PieChart,
  Activity,
  Calculator,
  HeartPulse,
  FileText,
  DollarSign,
  Users,
  BookmarkCheck,
  Moon,
  Sun,
  LogOut,
  FileSearch,
  UserCog,
  Menu,
  ChevronDown,
} from 'lucide-react';

const navItems: { id: ScreenId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'comparison', label: 'Compare', icon: ArrowRightLeft },
  { id: 'analysis', label: 'Analysis', icon: PieChart },
  { id: 'simulator', label: 'Risk Sim', icon: Activity },
  { id: 'calculator', label: 'Life Calc', icon: Calculator },
  { id: 'affordability', label: 'Affordability', icon: DollarSign },
  { id: 'dependencies', label: 'Dependencies', icon: Users },
  { id: 'healthplanner', label: 'Health', icon: HeartPulse },
  { id: 'savedplans', label: 'Saved Plans', icon: BookmarkCheck },
  { id: 'deepdive', label: 'Deep Dive', icon: FileText },
  { id: 'policyscan', label: 'Policy Scan', icon: FileSearch },
];

const NavTabs: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { currentScreen, setCurrentScreen } = useApp();
  const activeRef = useRef<HTMLButtonElement>(null);
  // In the scrolling row, keep the current screen's tab in view (it can be off-screen on phones).
  useEffect(() => {
    if (compact) activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [compact, currentScreen]);
  return navItems.map(item => {
    const Icon = item.icon;
    const isActive = currentScreen === item.id;
    return (
      <button
        key={item.id}
        ref={isActive ? activeRef : undefined}
        onClick={() => setCurrentScreen(item.id)}
        aria-current={isActive ? 'page' : undefined}
        className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-bold uppercase tracking-wider transition-all duration-200 ${
          compact ? 'px-3 py-2 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          isActive
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>{item.label}</span>
      </button>
    );
  });
};

/**
 * Phones: one large "Menu" button (showing the current screen) that opens every screen as big touch targets.
 * Opening moves focus into the list; Escape or a tap outside closes it and focus returns to the button.
 */
const MobileMenu: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useApp();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const current = navItems.find(i => i.id === currentScreen);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) toggleRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLButtonElement>('button[aria-current="page"], button')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !toggleRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div className="sm:hidden mt-3 pt-2 border-t border-border">
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="flex w-full min-h-12 items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 font-bold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span className="flex items-center gap-2">
          <Menu className="w-5 h-5" aria-hidden="true" />
          Menu
        </span>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          {current?.label}
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <nav
          id="mobile-menu"
          ref={panelRef}
          aria-label="Main"
          onKeyDown={e => e.key === 'Escape' && close(true)}
          className="mt-2 grid grid-cols-2 gap-2 pb-1"
        >
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setCurrentScreen(item.id);
                  close(false);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-12 items-center gap-2 rounded-xl px-3 text-left text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-muted/40 text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};

export const Navbar: React.FC = () => {
  const { setCurrentScreen, user, logout } = useApp();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/80 px-6 py-3 transition-colors">
      <div className="max-w-[120rem] mx-auto">
      <div className="flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <button
          onClick={() => setCurrentScreen('dashboard')}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 fill-white/20" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-lg font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500">
              ShieldIQ
            </span>
            <span className="hidden min-[400px]:block text-[9px] font-bold tracking-[0.25em] text-muted-foreground uppercase">
              Actuarial Intelligence
            </span>
          </div>
        </button>

        {/* Inline tabs, only where everything fits on one row */}
        {/* min-[1920px]: logo + all tabs (one line each) + controls need ~1,890px of layout width (measured) plus room for a scrollbar, so the header container is
            120rem wide. Tailwind needs literal class names, so the breakpoint is written out here and in the row below. */}
        <nav aria-label="Main" className="hidden min-[1920px]:flex items-center gap-1 bg-muted/60 p-1 rounded-full border border-border/50">
          <NavTabs />
        </nav>

        {/* Controls: Theme & Profile */}
        <div className="flex items-center gap-1 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-muted/40 hover:bg-muted border border-border/50 transition-all"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-700 dark:text-amber-400" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
          </Button>

          {user.isLoggedIn ? (
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <button
                type="button"
                onClick={() => setCurrentScreen('settings')}
                aria-label="Account settings"
                title="Account settings"
                className="hidden sm:flex flex-col text-right whitespace-nowrap rounded-lg px-2 py-1 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className="text-xs font-bold text-foreground">{user.name}</span>
                <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {user.cityTier}
                </span>
              </button>
              {/* Phones hide the name, so settings get an icon of their own. */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentScreen('settings')}
                aria-label="Account settings"
                title="Account settings"
                className="sm:hidden text-muted-foreground rounded-full"
              >
                <UserCog className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                title="Logout"
                className="text-muted-foreground hover:text-red-500 rounded-full hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setCurrentScreen('login')}
              className="bg-blue-600 hover:bg-blue-700 font-bold uppercase text-[10px] tracking-widest px-4 py-2 rounded-full text-white"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>

        {/* Tablets and laptops: tabs on their own row, scrolling sideways when they don't all fit */}
        <nav
          aria-label="Main"
          className="hidden sm:flex min-[1920px]:hidden mt-3 pt-2 border-t border-border items-center gap-1 relative overflow-x-auto pb-1 [scrollbar-width:thin]"
        >
          <NavTabs compact />
        </nav>

        <MobileMenu />
      </div>
    </header>
  );
};
