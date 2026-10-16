import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    LayoutDashboard,
    PieChart,
    FileText,
    Settings,
    ShieldCheck,
    ArrowRight,
    ShieldAlert,
    ArrowRightLeft,
    Activity,
    Hospital,
    TrendingUp,
    AlertTriangle,
    ChevronRight,
    LogOut,
    CheckCircle2,
    FileSearch
} from "lucide-react";
import { useApp, ScreenId } from '@/lib/AppContext';
import { formatINR, reviewOverdueMonths } from '@/lib/utils';
import { ShieldIQApi, type PlanTypeOptions } from '@/lib/api';
import { AiStrategyPanel } from '@/components/AiStrategyPanel';

interface NavItem {
    id: ScreenId | 'reports' | 'settings';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analysis', label: 'Coverage Analysis', icon: ShieldAlert },
    { id: 'comparison', label: 'Policy Compare', icon: ArrowRightLeft },
    { id: 'simulator', label: 'Risk Simulator', icon: Activity },
    { id: 'calculator', label: 'Life Calculator', icon: PieChart },
    { id: 'healthplanner', label: 'Health Planner', icon: Hospital },
    { id: 'policyscan', label: 'Policy Scan', icon: FileSearch },
    { id: 'reports', label: 'My Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
];

export const DashboardView: React.FC = () => {
    const { user, currentScreen, setCurrentScreen, logout, isBackendConnected, strategy } = useApp();
    const [planTypes, setPlanTypes] = useState<PlanTypeOptions[] | null>(null);

    // Recommended plan per insurance type; reloaded whenever the strategy (i.e. the profile) changes.
    useEffect(() => {
        if (!strategy) return;
        ShieldIQApi.getPlanOptions().then(res => setPlanTypes(res && res.success ? res.data : null));
    }, [strategy]);

    const handleNavClick = (id: NavItem['id']) => {
        if (id === 'reports') {
            setCurrentScreen('savedplans');
        } else if (id === 'settings') {
            setCurrentScreen('settings');
        } else {
            setCurrentScreen(id);
        }
    };

    const declaredCover = user.existingLifeCover + user.existingHealthCover;
    const scoreColor = !strategy ? 'text-muted-foreground' : strategy.score >= 65 ? 'text-emerald-500' : strategy.score >= 40 ? 'text-amber-500' : 'text-red-500';
    const scoreBar = !strategy ? 'bg-muted' : strategy.score >= 65 ? 'bg-emerald-500' : strategy.score >= 40 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="flex h-screen bg-background font-sans">
            {/* Sidebar */}
            <aside className="w-72 border-r border-border flex flex-col p-6 bg-muted/30">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/20">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-foreground tracking-tight leading-none">
                            ShieldIQ <span className="text-blue-600 text-[10px] align-top">PRO</span>
                        </h1>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-bold">
                            <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {isBackendConnected ? 'LIVE ENGINE' : 'OFFLINE MODE'}
                        </span>
                    </div>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = currentScreen === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item.id)}
                                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${isActive
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800 space-y-2">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                            {strategy ? `${strategy.rating} · ${strategy.score}/100` : 'Profile incomplete'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                            {strategy
                                ? `Life ${formatINR(user.existingLifeCover)} · Health ${formatINR(user.existingHealthCover)} declared.`
                                : 'Finish onboarding to get your protection score.'}
                        </p>
                    </div>

                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600/10 border-2 border-blue-500/30 flex items-center justify-center font-bold text-blue-600 text-sm">
                                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-black text-foreground leading-none truncate max-w-[120px]">
                                    {user.name}
                                </p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 truncate max-w-[120px]">
                                    {user.occupation || '—'}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={logout}
                            title="Sign Out"
                            className="text-slate-400 hover:text-red-500"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-12 space-y-8">
                <header className="flex justify-between items-end">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-foreground tracking-tight uppercase">Analytical Dashboard</h2>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                            Real-time clarity for {user.name}{user.city ? ` • ${user.city}` : ''} • {user.cityTier}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentScreen('comparison')}
                            className="font-bold border-slate-200 dark:border-slate-800"
                        >
                            <FileText className="w-4 h-4 mr-2" /> Compare Policies
                        </Button>
                        <Button
                            onClick={() => setCurrentScreen('calculator')}
                            className="font-bold bg-blue-600 hover:bg-blue-700"
                        >
                            New Risk Audit
                        </Button>
                    </div>
                </header>

                {reviewOverdueMonths(user.profileReviewedAt) !== null && (
                    <div role="status" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-amber-500/40 bg-amber-500/10">
                        <div className="space-y-1">
                            <p className="font-black text-foreground">Time for your yearly review</p>
                            <p className="text-sm text-muted-foreground">
                                Your profile was last updated {reviewOverdueMonths(user.profileReviewedAt)} months ago. Income, loans and family change, and so does the cover you need.
                            </p>
                        </div>
                        <Button variant="outline" onClick={() => setCurrentScreen('onboarding')} className="font-bold shrink-0">Review Profile</Button>
                    </div>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-slate-100 dark:border-slate-800 shadow-sm">
                        <CardHeader className="p-6 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Life Cover Need</span>
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <div className="text-3xl font-black text-foreground font-mono tracking-tighter">
                                {strategy ? formatINR(strategy.life.totalNeed) : '—'}
                            </div>
                            <CardDescription className="text-[10px] text-muted-foreground font-bold uppercase mt-2">
                                {strategy && strategy.life.savings > 0 ? 'Income + loans + education − savings' : 'Income replacement + loans + education'}
                            </CardDescription>
                        </CardContent>
                    </Card>

                    <Card className="border-border shadow-sm">
                        <CardHeader className="p-6 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Coverage Gap</span>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <div className="text-3xl font-black text-foreground font-mono tracking-tighter">
                                {strategy ? formatINR(strategy.life.gap + strategy.health.gap + (strategy.parentsHealth?.gap ?? 0)) : '—'}
                            </div>
                            <CardDescription className="text-[10px] text-muted-foreground font-bold uppercase mt-2">
                                {strategy
                                    ? `Life ${formatINR(strategy.life.gap)} · Health ${formatINR(strategy.health.gap)}${strategy.parentsHealth ? ` · Parents ${formatINR(strategy.parentsHealth.gap)}` : ''}`
                                    : 'Unsecured exposure'}
                            </CardDescription>
                        </CardContent>
                    </Card>

                    <Card className="border-border shadow-sm">
                        <CardHeader className="p-6 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Your Current Cover</span>
                            <Badge className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-none font-black text-[9px] uppercase tracking-widest">
                                Declared
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <div className="text-3xl font-black text-foreground font-mono tracking-tighter">
                                {formatINR(declaredCover)}
                            </div>
                            <CardDescription className="text-[10px] text-muted-foreground font-bold uppercase mt-2">
                                Life {formatINR(user.existingLifeCover)} · Health {formatINR(user.existingHealthCover)}
                            </CardDescription>
                        </CardContent>
                    </Card>

                    <Card className="border-border shadow-sm">
                        <CardHeader className="p-6 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Risk Adequacy</span>
                            <span className={`${scoreColor} font-black font-mono`}>{strategy ? `${strategy.score}/100` : '—'}</span>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full ${scoreBar} transition-all`} style={{ width: `${strategy?.score ?? 0}%` }} />
                            </div>
                            <CardDescription className="text-[10px] text-muted-foreground font-bold uppercase mt-2">
                                {strategy ? `${strategy.rating} · 85+ is optimal` : 'Complete onboarding to score'}
                            </CardDescription>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 border-border shadow-xl min-h-[460px] flex flex-col">
                        <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-lg font-black text-foreground uppercase tracking-tight">Protection Strategy Overview</CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCurrentScreen('analysis')}
                                className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                            >
                                Full analysis <ArrowRight className="w-3 h-3 ml-2" />
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-1 p-8 pt-4 flex flex-col justify-between">
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground font-medium">
                                    Recommended plan for each type of cover, quoted for you. Open Compare to see all four options per type.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {!planTypes && (
                                        <p className="text-xs text-muted-foreground">{strategy ? 'Quoting plans…' : 'Complete your profile to see recommended plans.'}</p>
                                    )}
                                    {planTypes?.map(t => {
                                        const pick = t.options.find(o => o.recommended);
                                        return (
                                            <button
                                                key={t.type}
                                                type="button"
                                                onClick={() => setCurrentScreen('comparison')}
                                                className="text-left p-4 rounded-xl border border-border bg-card/60 hover:bg-muted/40 transition-all hover:border-blue-500/40 group"
                                            >
                                                <div className="flex justify-between items-start mb-2 gap-2">
                                                    <Badge variant="outline" className="text-[10px] font-mono">{t.label}</Badge>
                                                    {pick && <span className="text-xs font-bold text-blue-600 font-mono">{formatINR(pick.annualPremium)}/yr</span>}
                                                </div>
                                                <h4 className="font-bold text-foreground text-sm group-hover:text-blue-600 transition-colors">
                                                    {pick ? pick.name : 'Already covered'}
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {pick ? `${formatINR(pick.cover)} cover · 4 options to compare` : 'Your existing cover meets the need · see upgrade options'}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-6 p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Activity className="w-5 h-5 text-blue-600" />
                                    <div>
                                        <p className="text-xs font-bold text-foreground">Interactive Simulation Ready</p>
                                        <p className="text-[11px] text-muted-foreground">Test portfolio stress under illness, death, and disability scenarios.</p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => setCurrentScreen('simulator')}
                                    className="bg-blue-600 hover:bg-blue-700 text-xs font-bold"
                                >
                                    Launch Simulator
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <AiStrategyPanel maxInsights={3} />

                        <Card className="p-8 border-border shadow-sm space-y-6">
                            <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Urgent Nodes</h5>
                            <div className="space-y-2">
                                {[
                                    { label: 'Recalculate Human Life Value', screen: 'calculator' as ScreenId },
                                    { label: 'Audit Health Floater Top-Up', screen: 'healthplanner' as ScreenId },
                                    { label: 'Review Actuarial Policy Fine Print', screen: 'deepdive' as ScreenId }
                                ].map((node, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentScreen(node.screen)}
                                        className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent transition-all text-left group"
                                    >
                                        <span className="text-[11px] font-bold text-foreground/80 group-hover:text-blue-600 transition-colors">
                                            {node.label}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
                                    </button>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>

                <footer className="pt-12 text-center space-y-3">
                    <div className="flex justify-center gap-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <button
                            type="button"
                            onClick={() => setCurrentScreen('compliance')}
                            className="hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-0 p-0"
                        >
                            Disclaimer & Compliance Disclosure
                        </button>
                        <span>•</span>
                        <button
                            type="button"
                            onClick={() => setCurrentScreen('settings')}
                            className="hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-0 p-0"
                        >
                            Platform Settings
                        </button>
                        <span>•</span>
                        <button
                            type="button"
                            onClick={() => setCurrentScreen('systemstates')}
                            className="hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-0 p-0"
                        >
                            System Status
                        </button>
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.4em] leading-relaxed max-w-lg mx-auto italic">
                        ShieldIQ Platform • Analytical Intelligence for Human Risk Management • © 2026
                    </p>
                </footer>
            </main>
        </div>
    );
};
