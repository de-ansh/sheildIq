import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Activity,
    Lightbulb,
    ArrowUpRight,
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    Landmark,
    Zap,
    Download,
    PieChart,
    ChevronRight,
} from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { formatINR } from '@/lib/utils';

// Health premiums in India have been rising ~10% a year; level term premiums stay fixed for the policy term.
const HEALTH_PREMIUM_INFLATION = 0.1;

const getZone = (ratio: number) => {
    if (ratio < 7.0) return { label: 'Safe Zone', color: 'text-emerald-500' };
    if (ratio <= 12.0) return { label: 'Alert Zone', color: 'text-amber-500' };
    return { label: 'Critical Zone', color: 'text-red-500' };
};

export const AffordabilityAnalysisView: React.FC = () => {
    const { user, strategy, setCurrentScreen } = useApp();
    const [timeHorizon, setTimeHorizon] = useState<'5Y' | '10Y'>('5Y');

    const a = strategy?.affordability;
    const lifePremium = strategy?.life.estimatedAnnualPremiumForGap ?? 0;
    const healthPremium = Math.max(0, (a?.estimatedAnnualPremium ?? 0) - lifePremium);
    const ratio = a?.premiumToIncomeRatio ?? 0;
    const zone = getZone(ratio);
    const projected = (years: number) => lifePremium + healthPremium * Math.pow(1 + HEALTH_PREMIUM_INFLATION, years);
    const growth = (years: number) => (a && a.estimatedAnnualPremium > 0 ? Math.round((projected(years) / a.estimatedAnnualPremium - 1) * 100) : 0);
    const horizonYears = timeHorizon === '5Y' ? 5 : 10;
    const markerLeft = `${Math.min(100, (ratio / 20) * 100)}%`;
    const dash = (v: string) => (strategy ? v : '—');

    const levers = strategy
        ? [
            strategy.health.superTopUp > 0 && {
                title: 'Base + Super Top-Up',
                desc: `Cover the last ${formatINR(strategy.health.superTopUp)} with a super top-up above a ${formatINR(strategy.health.basePolicy)} deductible instead of one large policy. Top-up layers cost a fraction of base cover.`,
                tag: 'Lower premium',
            },
            user.age < 40 && strategy.life.gap > 0 && {
                title: 'Lock In Term Rates Early',
                desc: `Term premiums roughly double between ages 35 and 45. Buying the ${formatINR(strategy.life.gap)} gap now fixes today's rate for the whole term.`,
                tag: 'Age advantage',
            },
            user.lifestyleRisks.some(r => /tobacco|smok/i.test(r)) && {
                title: 'Quit Tobacco for Non-Smoker Rates',
                desc: 'Tobacco users pay about 80% more for term cover. Most insurers re-rate after 12+ months tobacco-free.',
                tag: 'Up to 45% saving',
            },
            a && a.estimatedAnnualPremium > a.premiumBudget && {
                title: 'Sequence the Purchases',
                desc: `Closing every gap needs ${formatINR(a.estimatedAnnualPremium)} a year against a ${formatINR(a.premiumBudget)} budget. Buy term life first, then add health cover.`,
                tag: 'Stay in budget',
            },
            {
                title: 'Buy Long Policy Terms',
                desc: 'Choose term cover up to retirement and multi-year health policies; both avoid re-underwriting at older, more expensive ages.',
                tag: 'Rate stability',
            },
        ].filter(Boolean) as { title: string; desc: string; tag: string }[]
        : [];

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 text-foreground font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-border">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                        <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30 text-blue-600 bg-blue-50 dark:bg-blue-950/30">
                            Based on your profile
                        </Badge>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground">Affordability Analysis</h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        What closing your protection gaps would cost {user.name}, measured against income and existing commitments.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto print:hidden">
                    <Button variant="outline" onClick={() => window.print()} className="font-bold border-border">
                        <Download className="w-4 h-4 mr-2" />
                        Print Report
                    </Button>
                    <Button onClick={() => setCurrentScreen('simulator')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                        <Zap className="w-4 h-4 mr-2" />
                        Simulate Change
                    </Button>
                </div>
            </div>

            {!strategy && !user.onboardingCompleted && user.isLoggedIn && (
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-sm flex items-center justify-between gap-4">
                    <span>Complete your financial profile to calculate affordability.</span>
                    <Button size="sm" onClick={() => setCurrentScreen('onboarding')}>Complete Profile</Button>
                </div>
            )}

            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-border shadow-sm">
                    <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Premium-to-Income</span>
                        <Activity className="w-4 h-4 text-blue-600" />
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className="text-3xl font-black font-mono tracking-tight text-foreground">{dash(`${ratio}%`)}</div>
                        <p className="text-[10px] text-muted-foreground font-medium mt-2">Premium to close gaps ÷ gross income</p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Debt-to-Income</span>
                        <Landmark className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className="text-3xl font-black font-mono tracking-tight text-foreground">{dash(`${a?.liabilityToIncome}x`)}</div>
                        <p className="text-[10px] text-muted-foreground font-medium mt-2">
                            Loans of {formatINR(user.homeLoan + user.otherLoans)} vs annual income
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Monthly Premium</span>
                        <PieChart className="w-4 h-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className="text-3xl font-black font-mono tracking-tight text-foreground">{dash(formatINR((a?.estimatedAnnualPremium ?? 0) / 12))}</div>
                        <p className="text-[10px] text-muted-foreground font-medium mt-2">Indicative, to close life + health gaps</p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sustainability Tier</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className={`text-2xl font-black uppercase tracking-tight ${strategy ? zone.color : 'text-muted-foreground'}`}>{dash(zone.label)}</div>
                        <p className="text-[10px] text-muted-foreground font-medium mt-2">Expenses take {dash(`${a?.expenseRatio}%`)} of income</p>
                    </CardContent>
                </Card>
            </div>

            {/* Sustainability Zones Gauge & Escalation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Card className="lg:col-span-6 border-border shadow-sm p-8 space-y-6">
                    <div>
                        <CardTitle className="text-lg font-black uppercase tracking-tight">Sustainability Zones</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            Protection premiums should stay under about 10% of gross annual income.
                        </CardDescription>
                    </div>

                    <div className="space-y-4">
                        <div className="h-6 w-full rounded-xl overflow-hidden flex font-mono text-[10px] font-bold text-white shadow-inner">
                            <div className="bg-emerald-500 w-[35%] flex items-center justify-center">SAFE (&lt;7%)</div>
                            <div className="bg-amber-500 w-[25%] flex items-center justify-center">ALERT (7-12%)</div>
                            <div className="bg-red-500 w-[40%] flex items-center justify-center">CRITICAL (&gt;12%)</div>
                        </div>
                        <div className="relative h-5 text-xs font-mono font-bold text-muted-foreground">
                            <span className="absolute left-0">0%</span>
                            {strategy && (
                                <span className="absolute -translate-x-1/2 text-blue-600 font-black whitespace-nowrap" style={{ left: markerLeft }}>▲ {ratio}%</span>
                            )}
                            <span className="absolute right-0">20%+</span>
                        </div>
                    </div>

                    {a && (
                        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                {a.estimatedAnnualPremium <= a.premiumBudget
                                    ? <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Within Budget</>
                                    : <><AlertTriangle className="w-4 h-4 text-amber-500" /> Over Budget</>}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Closing your gaps costs about {formatINR(a.estimatedAnnualPremium)} a year against a {formatINR(a.premiumBudget)} budget
                                (10% of income). After {formatINR(a.annualExpenses)} of yearly expenses you have about {formatINR(Math.max(0, a.annualIncome - a.annualExpenses - a.estimatedAnnualPremium))} left
                                before tax, loan EMIs and savings.
                            </p>
                        </div>
                    )}
                </Card>

                <Card className="lg:col-span-6 border-border shadow-sm p-8 space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Projected Escalation</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Term premiums stay level; health premiums rise about 10% a year.
                            </CardDescription>
                        </div>
                        <div className="flex gap-1 bg-muted p-1 rounded-lg">
                            {(['5Y', '10Y'] as const).map(horizon => (
                                <button
                                    key={horizon}
                                    onClick={() => setTimeHorizon(horizon)}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${timeHorizon === horizon ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                                >
                                    {horizon}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 font-mono">
                        {[
                            { label: 'Year 1 (Today)', value: projected(0), note: 'Baseline', color: 'text-foreground' },
                            { label: 'Year 3', value: projected(3), note: `+${growth(3)}%`, color: 'text-amber-500' },
                            { label: `Year ${horizonYears}`, value: projected(horizonYears), note: `+${growth(horizonYears)}%`, color: 'text-red-500' },
                        ].map(item => (
                            <div key={item.label} className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{item.label}</span>
                                <div className={`text-xl font-black ${item.color}`}>{dash(formatINR(item.value))}</div>
                                <span className="text-[10px] text-muted-foreground font-sans">{strategy ? `${item.note} · per year` : ''}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Cost Levers & Premium Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Card className="lg:col-span-5 bg-slate-950 text-white p-8 border-none relative overflow-hidden flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-blue-400">
                            <Lightbulb className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Cost Levers</span>
                        </div>
                        <div className="space-y-4">
                            {levers.length === 0 && <p className="text-sm text-slate-400">Loading…</p>}
                            {levers.map(opt => (
                                <div key={opt.title} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                                    <div className="flex justify-between items-center gap-2">
                                        <h4 className="text-sm font-bold text-white">{opt.title}</h4>
                                        <Badge className="bg-blue-600/30 text-blue-300 border-none text-[9px] font-bold shrink-0">{opt.tag}</Badge>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">{opt.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Button onClick={() => setCurrentScreen('comparison')} className="w-full mt-6 bg-white text-slate-950 hover:bg-slate-100 font-bold py-6 group">
                        Compare Policies
                        <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Button>
                </Card>

                <Card className="lg:col-span-7 border-border shadow-sm p-8 space-y-6">
                    <div className="flex justify-between items-center gap-4">
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Premium Breakdown</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">Indicative annual cost of closing each gap.</CardDescription>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs shrink-0">Total: {dash(`${formatINR(a?.estimatedAnnualPremium ?? 0)}/yr`)}</Badge>
                    </div>

                    <div className="space-y-3">
                        {[
                            { label: 'Term Life', gap: strategy?.life.gap ?? 0, premium: lifePremium, screen: 'calculator' as const },
                            { label: 'Health (Base + Top-Up)', gap: strategy?.health.gap ?? 0, premium: healthPremium, screen: 'healthplanner' as const },
                        ].map(row => {
                            const pct = a && a.estimatedAnnualPremium > 0 ? Math.round((row.premium / a.estimatedAnnualPremium) * 100) : 0;
                            return (
                                <button
                                    key={row.label}
                                    onClick={() => setCurrentScreen(row.screen)}
                                    className="w-full text-left p-5 rounded-xl border border-border hover:bg-muted/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-blue-500/40"
                                >
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-foreground group-hover:text-blue-600 transition-colors">{row.label}</h4>
                                        <p className="text-xs text-muted-foreground">Gap: {dash(formatINR(row.gap))}</p>
                                    </div>
                                    <div className="flex sm:flex-col items-end justify-between sm:justify-center font-mono">
                                        <span className="text-base font-black text-foreground">{dash(`${formatINR(row.premium)}/yr`)}</span>
                                        <span className="text-xs text-muted-foreground font-sans">{strategy ? `${pct}% of total` : ''}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-xs font-bold text-foreground">Compare with Market Options</span>
                            <p className="text-[11px] text-muted-foreground">See catalog policies side by side.</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setCurrentScreen('comparison')} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                            Open Compare <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};
