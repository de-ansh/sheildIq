import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowRight, Activity, TrendingUp, AlertTriangle, ChevronRight } from "lucide-react";
import { useApp, ScreenId } from '@/lib/AppContext';
import { formatINR, reviewOverdueMonths } from '@/lib/utils';
import { ShieldIQApi, type PlanTypeOptions } from '@/lib/api';
import { AiStrategyPanel } from '@/components/AiStrategyPanel';

export const DashboardView: React.FC = () => {
    const { user, setCurrentScreen, strategy } = useApp();
    const [planTypes, setPlanTypes] = useState<PlanTypeOptions[] | null>(null);

    // Recommended plan per insurance type; reloaded whenever the strategy (i.e. the profile) changes.
    useEffect(() => {
        if (!strategy) return;
        ShieldIQApi.getPlanOptions().then(res => setPlanTypes(res && res.success ? res.data : null));
    }, [strategy]);

    const declaredCover = user.existingLifeCover + user.existingHealthCover;
    const scoreColor = !strategy ? 'text-muted-foreground' : strategy.score >= 65 ? 'text-emerald-700 dark:text-emerald-400' : strategy.score >= 40 ? 'text-amber-700 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
    const scoreBar = !strategy ? 'bg-muted' : strategy.score >= 65 ? 'bg-emerald-500' : strategy.score >= 40 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 text-foreground font-sans">
                <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-foreground tracking-tight uppercase">Analytical Dashboard</h2>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                            Real-time clarity for {user.name}{user.city ? ` • ${user.city}` : ''} • {user.cityTier}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentScreen('comparison')}
                            className="font-bold border-slate-200 dark:border-slate-800"
                        >
                            <FileText className="w-4 h-4 mr-2" /> Compare Policies
                        </Button>
                        <Button
                            onClick={() => setCurrentScreen('calculator')}
                            className="font-bold bg-blue-600 hover:bg-blue-700 text-white"
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
                            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Life Cover Need</span>
                            <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
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
                            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
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
                            <Badge className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-none font-black text-[9px] uppercase tracking-widest">
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
                        <CardHeader className="p-6 sm:p-8 pb-0 sm:pb-0 flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
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
                                    className="bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white"
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
                    <p className="text-[9px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-[0.4em] leading-relaxed max-w-lg mx-auto italic">
                        ShieldIQ Platform • Analytical Intelligence for Human Risk Management • © 2026
                    </p>
                </footer>
        </div>
    );
};
