import React from 'react';
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
];

export const Navbar: React.FC = () => {
  const { currentScreen, setCurrentScreen, user, logout } = useApp();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/80 px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
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
            <span className="text-[9px] font-bold tracking-[0.25em] text-muted-foreground uppercase">
              Actuarial Intelligence
            </span>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav className="hidden xl:flex items-center gap-1 bg-muted/60 p-1 rounded-full border border-border/50">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentScreen(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 uppercase tracking-wider ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Controls: Theme & Profile */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-muted/40 hover:bg-muted border border-border/50 transition-all"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
          </Button>

          {user.isLoggedIn ? (
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-foreground">{user.name}</span>
                <span className="text-[9px] text-emerald-500 font-semibold uppercase tracking-wider">
                  Verified Entity
                </span>
              </div>
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
              className="bg-blue-600 hover:bg-blue-700 font-bold uppercase text-[10px] tracking-widest px-4 py-2 rounded-full"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>

      {/* Mobile / Medium Screen Nav Drawer Bar */}
      <div className="xl:hidden mt-3 pt-2 border-t border-border flex items-center gap-1 overflow-x-auto pb-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap uppercase tracking-wider ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
