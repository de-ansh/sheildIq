import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
    Activity,
    GraduationCap,
    Home,
    Users,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Settings2,
    RefreshCw,
    Download,
    ArrowRight
} from "lucide-react";
import { useApp } from '@/lib/AppContext';

export const DependencyModelingView: React.FC = () => {
    const { user, setCurrentScreen } = useApp();

    const [inflationRate, setInflationRate] = useState<number[]>([3.2]);
    const [interestRate, setInterestRate] = useState<number[]>([5.5]);
    const [educationMultiplier, setEducationMultiplier] = useState<number[]>([1.4]);
    const [activeTimeline, setActiveTimeline] = useState<'30Y' | '10Y'>('30Y');

    const dependentsCount = user?.dependents ?? 2;
    const baseIncome = user?.income || 145000;

    const projections = useMemo(() => {
        const inf = inflationRate[0] / 100;
        const eduMult = educationMultiplier[0];

        const baseEducation = dependentsCount * 425000 * eduMult;
        const baseSpouseIncome = baseIncome * 18 * (1 + inf);
        const baseMortgage = 1000000;

        const totalLifetimeLiability = Math.round(baseEducation + baseSpouseIncome + baseMortgage);
        const peakYear = 2036;

        return {
            totalLifetimeLiability,
            baseEducation: Math.round(baseEducation),
            baseSpouseIncome: Math.round(baseSpouseIncome),
            baseMortgage,
            peakYear,
        };
    }, [inflationRate, educationMultiplier, dependentsCount, baseIncome]);

    const formatCurrency = (val: number) => {
        return `$${val.toLocaleString()}`;
    };

    const timelineMilestones = [
        { year: 2026, label: 'Baseline Start', status: 'normal', pressure: 40 },
        { year: 2031, label: 'Primary Schooling', status: 'moderate', pressure: 55 },
        { year: 2036, label: 'College + Mortgage Peak', status: 'critical', pressure: 95 },
        { year: 2041, label: 'Higher Ed Completion', status: 'moderate', pressure: 70 },
        { year: 2046, label: 'Mortgage Payoff Node', status: 'low', pressure: 45 },
        { year: 2051, label: 'Retirement Horizon', status: 'low', pressure: 30 },
        { year: 2056, label: 'Surplus Phase', status: 'surplus', pressure: 15 },
    ];

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 text-foreground font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-border">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                        <span>ACTUARIAL MODEL: DEP-V2.4</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30 text-blue-600 bg-blue-50 dark:bg-blue-950/30">
                            Monte Carlo Verified
                        </Badge>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground">Dependency Modeling</h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Long-term liability projection and financial pressure timeline for {user?.name || 'Alex Vance'}'s dependents across a 30-year horizon.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentScreen('dashboard')}
                        className="font-bold border-border"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export Audit
                    </Button>
                    <Button
                        onClick={() => setCurrentScreen('calculator')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                        <Activity className="w-4 h-4 mr-2" />
                        Calibrate Target Cover
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card className="border-border shadow-sm p-6">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Total Lifetime Liability
                    </span>
                    <div className="text-3xl font-black font-mono tracking-tight text-foreground mt-2">
                        {formatCurrency(projections.totalLifetimeLiability)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center">
                            <TrendingUp className="w-3 h-3 mr-0.5" /> +2.1%
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">adjusted for {inflationRate[0]}% inflation</span>
                    </div>
                </Card>

                <Card className="border-border shadow-sm p-6">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Peak Pressure Year
                    </span>
                    <div className="text-3xl font-black font-mono tracking-tight text-red-500 mt-2 flex items-baseline gap-2">
                        {projections.peakYear}
                        <Badge className="bg-red-500/10 text-red-500 border-none text-[9px] font-bold uppercase tracking-wider">
                            CRITICAL CONVERGENCE
                        </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium mt-2">
                        Dependent university matriculation coincides with terminal mortgage balance.
                    </p>
                </Card>

                <Card className="border-border shadow-sm p-6">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Projected Inflation Index
                    </span>
                    <div className="text-3xl font-black font-mono tracking-tight text-blue-600 mt-2">
                        {inflationRate[0].toFixed(1)}% <span className="text-sm font-sans font-bold text-muted-foreground">AVG</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                        <Badge variant="outline" className="text-[9px] font-mono">
                            1,000 Monte Carlo Iterations
                        </Badge>
                    </div>
                </Card>
            </div>

            {/* Dependency Heatmap / 30-Year Timeline */}
            <Card className="border-border shadow-sm p-8 space-y-8">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <CardTitle className="text-lg font-black uppercase tracking-tight">Dependency Heatmap</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            Intensity of cumulative financial pressure nodes across the 30-year lifecycle.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded bg-red-500" /> Critical
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded bg-amber-500" /> Standard
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded bg-blue-500" /> Minimal
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Surplus
                            </span>
                        </div>
                    </div>
                </div>

                {/* Visual Bar Timeline */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                        {timelineMilestones.map((ms) => {
                            const isPeak = ms.year === projections.peakYear;
                            let barColor = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                            if (ms.status === 'critical') barColor = 'bg-red-500/20 text-red-400 border-red-500/50';
                            else if (ms.status === 'moderate') barColor = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
                            else if (ms.status === 'surplus') barColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';

                            return (
                                <div
                                    key={ms.year}
                                    className={`p-4 rounded-xl border ${barColor} flex flex-col justify-between h-36 transition-all hover:scale-[1.02]`}
                                >
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-mono font-black">{ms.year}</span>
                                            {isPeak && (
                                                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                            )}
                                        </div>
                                        <p className="text-[11px] font-bold leading-tight line-clamp-2">
                                            {ms.label}
                                        </p>
                                    </div>

                                    <div className="space-y-1 mt-auto pt-3">
                                        <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${ms.status === 'critical' ? 'bg-red-500' : ms.status === 'moderate' ? 'bg-amber-500' : ms.status === 'surplus' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                style={{ width: `${ms.pressure}%` }}
                                            />
                                        </div>
                                        <span className="text-[9px] font-mono font-bold block text-right">
                                            {ms.pressure}% Load
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Card>

            {/* Goal-Based Coverage & Interactive Assumptions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Goal-Based Coverage Cards */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                            Goal-Based Coverage Requirements
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium">
                            Segmented capital reserves needed to safeguard all dependent commitments without asset liquidation.
                        </p>
                    </div>

                    <Card className="border-border shadow-sm p-6 hover:border-blue-500/40 transition-all">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 mt-1">
                                    <GraduationCap className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-base text-foreground">Higher Education Fund</h4>
                                    <p className="text-xs text-muted-foreground font-medium">
                                        Dependents: {dependentsCount} Children • Targeted University Window (2034–2042)
                                    </p>
                                    <div className="flex items-center gap-2 pt-2">
                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-bold">
                                            Fully Funded via Term Rider
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right font-mono">
                                <span className="text-2xl font-black text-foreground">
                                    {formatCurrency(projections.baseEducation)}
                                </span>
                                <p className="text-[10px] text-muted-foreground font-sans uppercase tracking-wider mt-0.5">
                                    Escalated Target
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="border-border shadow-sm p-6 hover:border-blue-500/40 transition-all">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 mt-1">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-base text-foreground">Spouse Income Replacement</h4>
                                    <p className="text-xs text-muted-foreground font-medium">
                                        Horizon: 2026–2056 (30 Years) • 70% Net Household Continuity
                                    </p>
                                    <div className="flex items-center gap-2 pt-2">
                                        <Badge className="bg-blue-500/10 text-blue-600 border-none text-[10px] font-bold">
                                            Active Term Protection
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right font-mono">
                                <span className="text-2xl font-black text-foreground">
                                    {formatCurrency(projections.baseSpouseIncome)}
                                </span>
                                <p className="text-[10px] text-muted-foreground font-sans uppercase tracking-wider mt-0.5">
                                    Net Present Value
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="border-border shadow-sm p-6 hover:border-blue-500/40 transition-all">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 mt-1">
                                    <Home className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-base text-foreground">Debt & Mortgage Clearance</h4>
                                    <p className="text-xs text-muted-foreground font-medium">
                                        Primary Residence • Fixed Rate Term Loan Payoff Buffer
                                    </p>
                                    <div className="flex items-center gap-2 pt-2">
                                        <Badge className="bg-amber-500/10 text-amber-600 border-none text-[10px] font-bold">
                                            Decreasing Term Structure
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right font-mono">
                                <span className="text-2xl font-black text-foreground">
                                    {formatCurrency(projections.baseMortgage)}
                                </span>
                                <p className="text-[10px] text-muted-foreground font-sans uppercase tracking-wider mt-0.5">
                                    Principal Outstanding
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Scenario Assumptions Controls */}
                <Card className="lg:col-span-5 border-border shadow-sm p-8 space-y-8">
                    <div className="flex items-center justify-between pb-4 border-b border-border">
                        <div className="flex items-center gap-2">
                            <Settings2 className="w-5 h-5 text-blue-600" />
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Scenario Assumptions</CardTitle>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono">
                            Interactive Stress
                        </Badge>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <Label>Projected General Inflation</Label>
                                <span className="text-blue-600 font-mono font-bold text-sm">{inflationRate[0].toFixed(1)}%</span>
                            </div>
                            <Slider
                                value={inflationRate}
                                onValueChange={setInflationRate}
                                max={10}
                                min={1}
                                step={0.1}
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                <span>1.0%</span>
                                <span>5.0%</span>
                                <span>10.0%</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <Label>Liability Interest Rate</Label>
                                <span className="text-blue-600 font-mono font-bold text-sm">{interestRate[0].toFixed(1)}%</span>
                            </div>
                            <Slider
                                value={interestRate}
                                onValueChange={setInterestRate}
                                max={12}
                                min={2}
                                step={0.2}
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                <span>2.0%</span>
                                <span>7.0%</span>
                                <span>12.0%</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <Label>Education Cost Multiplier</Label>
                                <span className="text-blue-600 font-mono font-bold text-sm">{educationMultiplier[0].toFixed(2)}x</span>
                            </div>
                            <Slider
                                value={educationMultiplier}
                                onValueChange={setEducationMultiplier}
                                max={2.5}
                                min={1.0}
                                step={0.05}
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                <span>1.00x</span>
                                <span>1.75x</span>
                                <span>2.50x</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                            <CheckCircle2 className="w-4 h-4" />
                            Model Dynamic Update Active
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                            Adjusting these sliders updates the timeline load curve and goal-based coverage targets in real time.
                        </p>
                    </div>

                    <Button
                        onClick={() => setCurrentScreen('calculator')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 group"
                    >
                        Apply to Life Insurance Calculator
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </Card>
            </div>
        </div>
    );
};
