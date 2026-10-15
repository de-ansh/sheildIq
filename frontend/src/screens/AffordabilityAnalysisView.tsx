import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Activity,
    BrainCircuit,
    ArrowUpRight,
    TrendingDown,
    TrendingUp,
    ShieldCheck,
    CheckCircle2,
    DollarSign,
    Zap,
    Download,
    PieChart,
    ChevronRight,
    Sparkles
} from "lucide-react";
import { useApp } from '@/lib/AppContext';

export const AffordabilityAnalysisView: React.FC = () => {
    const { user, policies, setCurrentScreen, setSelectedPolicyId } = useApp();
    const [timeHorizon, setTimeHorizon] = useState<'5Y' | '10Y'>('5Y');

    const totalMonthlyPremium = policies.reduce((sum, p) => sum + (p.monthlyPremium || 0), 0);
    const annualPremium = totalMonthlyPremium * 12;
    const annualIncome = user?.income || 145000;
    const premiumToIncomeRatio = Number(((annualPremium / (annualIncome || 1)) * 100).toFixed(2));

    const debtToPremiumRatio = 12.8;

    const getZone = (ratio: number) => {
        if (ratio < 7.0) return { label: 'Safe Zone', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
        if (ratio <= 12.0) return { label: 'Alert Zone', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
        return { label: 'Critical Zone', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' };
    };

    const currentZone = getZone(premiumToIncomeRatio);

    const year3Impact = Math.round(totalMonthlyPremium * 1.294);
    const year5Impact = Math.round(totalMonthlyPremium * 1.482);
    const year10Impact = Math.round(totalMonthlyPremium * 2.015);

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 text-foreground font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-border">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                        <span>REF: SIQ-2026-AF04</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30 text-blue-600 bg-blue-50 dark:bg-blue-950/30">
                            Actuarial Verified
                        </Badge>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground">Affordability Analysis</h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Real-time financial sustainability modeling and budget-tier stress assessment for {user?.name || 'Alex Vance'}.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentScreen('dashboard')}
                        className="font-bold border-border"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                    </Button>
                    <Button
                        onClick={() => setCurrentScreen('simulator')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                        <Zap className="w-4 h-4 mr-2" />
                        Simulate Change
                    </Button>
                </div>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-border shadow-sm">
                    <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Premium-to-Income</span>
                        <Activity className="w-4 h-4 text-blue-600" />
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className="text-3xl font-black font-mono tracking-tight text-foreground">
                            {premiumToIncomeRatio}%
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center">
                                <TrendingDown className="w-3 h-3 mr-0.5" /> -0.21%
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">vs prior quarter</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Debt-to-Premium</span>
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className="text-3xl font-black font-mono tracking-tight text-foreground">
                            {debtToPremiumRatio}%
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-amber-600 font-bold flex items-center">
                                <TrendingUp className="w-3 h-3 mr-0.5" /> +1.5%
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">liability service ratio</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Monthly Premium</span>
                        <PieChart className="w-4 h-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className="text-3xl font-black font-mono tracking-tight text-foreground">
                            ${totalMonthlyPremium.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-emerald-600 font-bold">
                                {policies.length} Policies active
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sustainability Tier</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className={`text-2xl font-black uppercase tracking-tight ${currentZone.color}`}>
                            {currentZone.label}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Active Monitoring</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sustainability Zones Gauge & Escalation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sustainability Zone Bar */}
                <Card className="lg:col-span-6 border-border shadow-sm p-8 space-y-6">
                    <div>
                        <CardTitle className="text-lg font-black uppercase tracking-tight">Sustainability Zones</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            Benchmark recommended ceiling is under 10% of gross annual compensation.
                        </CardDescription>
                    </div>

                    <div className="space-y-4">
                        <div className="h-6 w-full rounded-xl overflow-hidden flex font-mono text-[10px] font-bold text-white shadow-inner">
                            <div className="bg-emerald-500 w-[45%] flex items-center justify-center">
                                SAFE (&lt;7%)
                            </div>
                            <div className="bg-amber-500 w-[30%] flex items-center justify-center">
                                ALERT (7-12%)
                            </div>
                            <div className="bg-red-500 w-[25%] flex items-center justify-center">
                                CRITICAL (&gt;12%)
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-xs font-mono font-bold text-muted-foreground pt-2">
                            <span>0%</span>
                            <span className="text-blue-600 font-black flex items-center gap-1">
                                ▲ Current: {premiumToIncomeRatio}%
                            </span>
                            <span>20%+</span>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Comfortable Margin
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Your total annual commitment of ${(annualPremium).toLocaleString()} is comfortably cushioned within your safe cashflow perimeter, leaving ample room for discretionary savings and investments.
                        </p>
                    </div>
                </Card>

                {/* Projected Escalation */}
                <Card className="lg:col-span-6 border-border shadow-sm p-8 space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Projected Escalation</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Long-term health & age inflation impact on premium structure.
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
                        <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Year 1 (Today)</span>
                            <div className="text-xl font-black text-foreground">${totalMonthlyPremium}</div>
                            <span className="text-[10px] text-muted-foreground font-sans">Baseline</span>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Year 3 Impact</span>
                            <div className="text-xl font-black text-amber-500">${year3Impact}</div>
                            <span className="text-[10px] text-amber-600 font-sans">+29.4% inflation</span>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                {timeHorizon === '5Y' ? 'Year 5 Impact' : 'Year 10 Impact'}
                            </span>
                            <div className="text-xl font-black text-red-500">
                                ${timeHorizon === '5Y' ? year5Impact : year10Impact}
                            </div>
                            <span className="text-[10px] text-red-500 font-sans">
                                {timeHorizon === '5Y' ? '+48.2% forecast' : '+101.5% forecast'}
                            </span>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Compounding medical inflation at ~8.5% p.a. will elevate health premiums progressively. Locking in fixed term rates now protects long-term disposable income.
                    </p>
                </Card>
            </div>

            {/* AI Optimizer & Premium Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* AI Optimizer */}
                <Card className="lg:col-span-5 bg-slate-950 text-white p-8 border-none relative overflow-hidden flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-blue-400">
                            <BrainCircuit className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">AI Optimizer</span>
                        </div>

                        <h3 className="text-xl font-black tracking-tight leading-snug">
                            "Analysis of your policy structure suggests three optimization levers to stabilize long-term premium escalation."
                        </h3>

                        <div className="space-y-4">
                            {[
                                {
                                    title: "Deductible Shift",
                                    desc: "Increase base hospital deductible by $200 to save 12.4% monthly on floater.",
                                    tag: "Save 12.4%"
                                },
                                {
                                    title: "Health Savings Redirect",
                                    desc: "Allocate employer pre-tax flex credits to offset disability coverage riders.",
                                    tag: "Tax Efficient"
                                },
                                {
                                    title: "Co-Pay Calibration",
                                    desc: "Enabling voluntary 10% co-pay on secondary diagnostics yields $45/mo reduction.",
                                    tag: "Instant Saving"
                                }
                            ].map((opt, i) => (
                                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/40 transition-all space-y-1">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                            {opt.title}
                                        </h4>
                                        <Badge className="bg-blue-600/30 text-blue-300 border-none text-[9px] font-bold">
                                            {opt.tag}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                        {opt.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button
                        onClick={() => setCurrentScreen('comparison')}
                        className="w-full mt-6 bg-white text-slate-950 hover:bg-slate-100 font-bold py-6 group"
                    >
                        Apply Recommendations
                        <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Button>
                </Card>

                {/* Policy Premium Breakdown Table */}
                <Card className="lg:col-span-7 border-border shadow-sm p-8 space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Premium Breakdown by Policy</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Active portfolio contributions across life, health, and critical illness.
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">
                            Total: ${totalMonthlyPremium}/mo
                        </Badge>
                    </div>

                    <div className="space-y-3">
                        {policies.map(policy => {
                            const pct = Math.round((policy.monthlyPremium / (totalMonthlyPremium || 1)) * 100);
                            return (
                                <div
                                    key={policy.id}
                                    onClick={() => {
                                        setSelectedPolicyId(policy.id);
                                        setCurrentScreen('deepdive');
                                    }}
                                    className="p-5 rounded-xl border border-border hover:bg-muted/40 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-blue-500/40"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] font-mono">
                                                {policy.category}
                                            </Badge>
                                            <span className="text-xs font-mono text-muted-foreground">{policy.id}</span>
                                        </div>
                                        <h4 className="text-sm font-bold text-foreground group-hover:text-blue-600 transition-colors">
                                            {policy.title}
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            {policy.provider} • Cover: ${(policy.coverageAmount / 1000).toLocaleString()}k
                                        </p>
                                    </div>

                                    <div className="flex sm:flex-col items-end justify-between sm:justify-center font-mono">
                                        <span className="text-base font-black text-foreground">
                                            ${policy.monthlyPremium}/mo
                                        </span>
                                        <span className="text-xs text-muted-foreground font-sans">
                                            {pct}% of budget
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-xs font-bold text-foreground">Compare with Market Benchmarks</span>
                            <p className="text-[11px] text-muted-foreground">View equivalent coverage tier options from top accredited providers.</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentScreen('comparison')}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700"
                        >
                            Open Compare <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};
