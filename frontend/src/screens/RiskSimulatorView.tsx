import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
    Skull,
    Stethoscope,
    Accessibility,
    RefreshCw,
    Activity,
    BrainCircuit,
    Zap,
    TrendingDown,
    Loader2
} from "lucide-react";
import { ShieldIQApi, RiskSimResult } from '@/lib/api';
import { useApp } from '@/lib/AppContext';
import { formatINR } from '@/lib/utils';
import { ExplainResult } from '@/components/ExplainResult';

type Scenario = "death" | "illness" | "disability";
const LIFESTYLE_SCALES: Record<string, number> = {
    'Maintain Current Standard': 1,
    'Optimized (-10%)': 0.9,
    'Basic Survival (-25%)': 0.75,
};

export const RiskSimulatorView: React.FC = () => {
    const { user, setCurrentScreen } = useApp();

    const [scenario, setScenario] = useState<Scenario>("illness");
    const [cost, setCost] = useState<number[]>([1500000]);
    const [years, setYears] = useState(2);
    const [inflation, setInflation] = useState<number[]>([5]);
    const [lifestyleScale, setLifestyleScale] = useState<string>("Maintain Current Standard");
    const [isCalculating, setIsCalculating] = useState(false);
    const [simResult, setSimResult] = useState<RiskSimResult | null>(null);
    const [simError, setSimError] = useState<string | null>(null);

    // Cover that actually pays out in each scenario, from the user's declared policies.
    // Illness: hospital bills plus any critical-illness lump sum. Disability: only accident cover pays
    // (it covers accidental disability; disability from illness is not covered by it).
    const existingCoverTotal = scenario === 'death' ? user.existingLifeCover
        : scenario === 'illness' ? user.existingHealthCover + user.existingCiCover
        : user.existingPaCover;
    const monthlyExpenses = Math.round(user.monthlyExpenses * LIFESTYLE_SCALES[lifestyleScale]);

    const runSimulation = useCallback(async () => {
        setIsCalculating(true);
        try {
            const res = await ShieldIQApi.simulateRiskScenario({
                scenario,
                cost: cost[0],
                years: scenario === 'death' ? 1 : years,
                inflation: inflation[0],
                existingCover: existingCoverTotal,
                age: user.age,
                income: user.income,
                monthlyExpenses,
            });
            if (res && res.success && res.data) {
                setSimResult(res.data);
                setSimError(null);
            } else {
                setSimError(res?.error || 'Cannot reach the simulation engine. Check your connection and try again.');
            }
        } finally {
            setIsCalculating(false);
        }
    }, [scenario, cost, years, inflation, existingCoverTotal, user.age, user.income, monthlyExpenses]);

    useEffect(() => {
        const timer = setTimeout(runSimulation, 200);
        return () => clearTimeout(timer);
    }, [runSimulation]);

    // Corpus run-down: the payout left after treatment is spent at the household's annual expenses.
    const annualExpenses = monthlyExpenses * 12;
    // Mirrors the engine: health cover reimburses bills only, so illness leaves no cash for living costs.
    const leftover = simResult && scenario !== 'illness' ? Math.max(0, existingCoverTotal - simResult.treatmentCostTotal) : 0;
    const recommendedCorpus = leftover + (simResult?.shortfallAmount ?? 0);
    const recommendedYears = annualExpenses > 0 ? recommendedCorpus / annualExpenses : 0;
    const chartYears = Math.max(5, Math.ceil(recommendedYears), Math.ceil(simResult?.yearsFunded ?? 0));
    const chartMax = Math.max(1, recommendedCorpus, leftover);
    const pt = (yearOffset: number, corpus: number) => `${(yearOffset / chartYears) * 1000},${300 - (corpus / chartMax) * 280}`;
    const currentPath = `M${pt(0, leftover)} L${pt(simResult?.yearsFunded ?? 0, 0)}`;
    const recommendedPath = `M${pt(0, recommendedCorpus)} L${pt(recommendedYears, 0)}`;
    const ageTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(user.age + f * chartYears));

    const scenarioLabels = {
        death: "Early Death Event",
        illness: "Critical Illness",
        disability: "Total Disability",
    };

    const userInitials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
            {/* Top Nav Scenario Selector */}
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-8 py-4">
                <div className="flex items-center gap-4 text-blue-600">
                    <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md shadow-blue-600/20">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-foreground text-lg font-black tracking-tight uppercase leading-none">Risk Simulator</h2>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Actuarial Stress-Testing Engine</span>
                    </div>
                </div>

                <nav className="flex items-center bg-muted p-1 rounded-xl">
                    {[
                        { id: "death", label: "Early Death", icon: Skull },
                        { id: "illness", label: "Critical Illness", icon: Stethoscope },
                        { id: "disability", label: "Total Disability", icon: Accessibility }
                    ].map(s => (
                        <button
                            key={s.id}
                            onClick={() => setScenario(s.id as Scenario)}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black transition-all uppercase tracking-widest ${scenario === s.id ? "bg-background shadow-sm text-blue-600" : "text-muted-foreground hover:bg-background/50"}`}
                        >
                            <s.icon className="w-4 h-4" />
                            {s.label}
                        </button>
                    ))}
                </nav>

                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 border-2 border-blue-600/30 overflow-hidden font-black text-blue-600 flex items-center justify-center text-xs">
                        {userInitials}
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row">
                {/* Left Sidebar - Controls */}
                <aside className="w-full lg:w-80 border-r border-border bg-card p-8 space-y-10 overflow-y-auto">
                    <div className="space-y-2">
                        <h3 className="font-black text-foreground uppercase tracking-tight">Stress Test Controls</h3>
                        <p className="text-xs text-muted-foreground font-medium tracking-tight">Adjust event severity parameters.</p>
                    </div>

                    <div className="space-y-10">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <Label>{scenario === 'death' ? 'Final Expenses (Immediate)' : 'Treatment Cost (Total)'}</Label>
                                <span className="text-blue-600 font-mono font-bold">{formatINR(cost[0])}</span>
                            </div>
                            <Slider
                                value={cost}
                                onValueChange={setCost}
                                max={5000000}
                                min={100000}
                                step={50000}
                            />
                        </div>

                        {scenario !== 'death' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <Label>Recovery Window</Label>
                                <span className="text-blue-600 font-mono font-bold">{years} Years</span>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {[1, 2, 5, 8, 10].map(yr => (
                                    <button
                                        key={yr}
                                        onClick={() => setYears(yr)}
                                        className={`py-2 rounded-lg font-black text-[10px] border transition-all ${years === yr ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-muted/30 border-border text-muted-foreground hover:border-blue-200"}`}
                                    >
                                        {yr}
                                    </button>
                                ))}
                            </div>
                        </div>
                        )}

                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <Label>Medical Inflation</Label>
                                <span className="text-blue-600 font-mono font-bold">{inflation[0].toFixed(1)}%</span>
                            </div>
                            <Slider
                                value={inflation}
                                onValueChange={setInflation}
                                max={15}
                                min={0}
                                step={0.1}
                            />
                        </div>

                        <div className="space-y-4">
                            <Label htmlFor="lifestyle-scale-select" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lifestyle Scaling</Label>
                            <select
                                id="lifestyle-scale-select"
                                value={lifestyleScale}
                                onChange={(e) => setLifestyleScale(e.target.value)}
                                className="w-full bg-muted/30 border border-input rounded-lg text-xs font-bold py-2.5 px-3"
                            >
                                <option>Maintain Current Standard</option>
                                <option>Optimized (-10%)</option>
                                <option>Basic Survival (-25%)</option>
                            </select>
                            <p className="text-[10px] text-muted-foreground font-medium">
                                Household spend after the event: {formatINR(monthlyExpenses)}/month
                                {user.monthlyExpenses === 0 && ' (add monthly expenses in onboarding for a runway estimate)'}
                            </p>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/40 border border-border text-[10px] font-bold text-muted-foreground uppercase tracking-widest space-y-1">
                            <p>Age {user.age} · Income {formatINR(user.income)}/yr</p>
                            <p>Cover that pays out: <span className="text-foreground">{formatINR(existingCoverTotal)}</span></p>
                        </div>
                    </div>

                    <div className="pt-6">
                        <Button
                            onClick={runSimulation}
                            disabled={isCalculating}
                            className="w-full bg-slate-900 border-none dark:bg-slate-700 py-6 font-black uppercase tracking-widest text-[10px]"
                        >
                            {isCalculating ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Recalculating...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4" />
                                    Recalculate Model
                                </span>
                            )}
                        </Button>
                    </div>
                </aside>

                {/* Main Simulation View */}
                <div className="flex-1 p-8 lg:p-12 overflow-y-auto space-y-8 pb-32">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card className="md:col-span-2 border-border shadow-sm overflow-hidden">
                            <CardContent className="p-8 flex flex-col md:flex-row justify-between items-center gap-8 group hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Payout Runs Out At</p>
                                    <h3 className="text-6xl font-black text-red-500 font-mono tracking-tighter">
                                        {simResult ? simResult.depletionAge : '—'}
                                        <span className="text-lg font-bold text-muted-foreground/30 ml-2 uppercase tracking-widest">Years Old</span>
                                    </h3>
                                    <p className="text-xs text-muted-foreground font-medium italic">
                                        {!simResult
                                            ? 'Running simulation…'
                                            : scenario === 'illness'
                                                ? 'Health insurance pays hospital bills only. Living costs during recovery must come from savings or critical illness cover.'
                                                : simResult.yearsFunded > 0
                                                    ? `Current cover funds the household for ${simResult.yearsFunded} years after the event.`
                                                    : 'Current cover is used up by the event itself, leaving nothing for living costs.'}
                                    </p>
                                    {simError && <p role="alert" className="text-xs font-medium text-red-600">{simError}</p>}
                                </div>
                                <div className="h-20 w-px bg-muted hidden md:block" />
                                <div className="space-y-2 text-right">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Est. Funding Gap</p>
                                    <h3 className="text-3xl font-black text-foreground font-mono tracking-tighter">
                                        {simResult ? formatINR(simResult.shortfallAmount) : '—'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {simResult ? `of ${formatINR(simResult.totalFinancialImpact)} total impact is not covered.` : ''}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border shadow-sm">
                            <CardContent className="p-8 flex items-center flex-col justify-center gap-4 text-center">
                                <div className="relative size-28">
                                    <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
                                        <circle
                                            cx="18"
                                            cy="18"
                                            r="16"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            className="text-blue-600 transition-all duration-500"
                                            strokeDasharray={`${simResult?.adequacyIndex ?? 0} 100`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-black text-foreground font-mono">
                                            {simResult ? `${simResult.adequacyIndex}%` : '—'}
                                        </span>
                                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                                            {simResult?.riskSeverity ?? ''}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-black text-xs text-foreground uppercase tracking-tighter">Scenario Adequacy</p>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Share of impact covered</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="p-8 space-y-10 border-border">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <h4 className="text-lg font-black text-foreground uppercase tracking-tight">Financial Impact Timeline</h4>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Payout left after treatment, spent at {formatINR(annualExpenses)} a year.</p>
                            </div>
                            <div className="flex gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Current Plan</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Recommended</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-72 w-full relative">
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-8">
                                {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-full border-t border-border/50" />)}
                            </div>
                            {simResult && (
                            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 300" role="img"
                                aria-label={`Current cover lasts ${simResult.yearsFunded} years; with the recommended cover it lasts ${recommendedYears.toFixed(1)} years`}>
                                <path d={recommendedPath} fill="none" stroke="currentColor" strokeWidth="4" className="text-blue-600" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                                <path d={currentPath} fill="none" stroke="currentColor" strokeWidth="4" className="text-red-500" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                                <line x1={(simResult.yearsFunded / chartYears) * 1000} y1="0" x2={(simResult.yearsFunded / chartYears) * 1000} y2="300" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                            </svg>
                            )}
                            <div className="flex justify-between pt-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                {ageTicks.map((a, i) => <span key={i}>Age {a}</span>)}
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-slate-950 text-white p-10 border-none relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <BrainCircuit className="w-48 h-48 text-blue-500" />
                        </div>
                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center gap-3">
                                <Zap className="w-6 h-6 text-blue-400" />
                                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">Actuarial Risk Narrative</h4>
                            </div>
                            <div className="max-w-4xl space-y-6">
                                <p className="text-lg font-medium text-slate-300 leading-relaxed italic">
                                    {simResult ? (
                                        <>A <span className="text-white font-bold">{scenarioLabels[scenario]}</span> at age {user.age} costs about <span className="text-white font-bold">{formatINR(simResult.totalFinancialImpact)}</span>: {formatINR(simResult.treatmentCostTotal)} in {scenario === 'death' ? 'final expenses' : 'treatment'} and {formatINR(simResult.earningCapacityLoss)} of lost earnings. Your {formatINR(existingCoverTotal)} of cover absorbs {simResult.adequacyIndex}% of it{simResult.shortfallAmount > 0 ? <>, leaving a <span className="text-white font-bold underline decoration-red-500 underline-offset-8">{formatINR(simResult.shortfallAmount)}</span> gap</> : ''}.</>
                                    ) : 'Running simulation…'}
                                </p>
                                <div className="flex items-center gap-2 text-blue-400">
                                    <TrendingDown className="w-4 h-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Recommended Strategic Shift:</p>
                                </div>
                                <p className="text-sm text-slate-400 font-mono uppercase tracking-wider leading-relaxed">
                                    {simResult?.recommendation}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-white p-1 text-slate-900 dark:bg-slate-900 dark:text-white">
                                <ExplainResult
                                    screen="risk-simulator"
                                    inputs={{ scenario, cost: cost[0], recoveryYears: scenario === 'death' ? 0 : years, inflationPct: inflation[0], monthlyExpenses, coverThatPaysOut: existingCoverTotal, age: user.age, annualIncome: user.income }}
                                    result={simResult ? {
                                        totalFinancialImpact: simResult.totalFinancialImpact, treatmentCost: simResult.treatmentCostTotal, earningCapacityLoss: simResult.earningCapacityLoss,
                                        shortfall: simResult.shortfallAmount, adequacyPct: simResult.adequacyIndex, yearsFunded: simResult.yearsFunded,
                                        payoutRunsOutAtAge: simResult.depletionAge, severity: simResult.riskSeverity,
                                    } : null}
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <Button
                                    onClick={() => setCurrentScreen('calculator')}
                                    className="bg-blue-600 hover:bg-blue-700 font-black px-10 py-6 uppercase tracking-widest text-[10px]"
                                >
                                    Adjust Target Cover
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentScreen('comparison')}
                                    className="border-white/20 hover:bg-white/10 text-white font-black px-10 py-6 uppercase tracking-widest text-[10px]"
                                >
                                    Compare Plans
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </main>

            {/* Sticky Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border px-10 py-4 flex justify-between items-center z-50">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">
                    Indicative estimate · {inflation[0].toFixed(1)}% inflation + 3% medical premium · 8% return on payouts
                </p>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentScreen('comparison')}
                        className="font-black h-10 px-8 uppercase tracking-widest text-[10px]"
                    >
                        Compare Variants
                    </Button>
                    <Button
                        onClick={() => setCurrentScreen('calculator')}
                        className="bg-blue-600 hover:bg-blue-700 font-black h-10 px-8 uppercase tracking-widest text-[10px] text-white"
                    >
                        Recalibrate Policy Gap
                    </Button>
                </div>
            </footer>
        </div>
    );
};
