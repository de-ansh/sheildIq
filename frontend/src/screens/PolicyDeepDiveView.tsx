import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    CheckCircle2,
    XCircle,
    AlertCircle,
    ExternalLink,
    Download,
    Zap
} from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { formatINR } from '@/lib/utils';

export const PolicyDeepDiveView: React.FC = () => {
    const { policies, selectedPolicyId, setSelectedPolicyId, setCurrentScreen } = useApp();

    const activePolicy = policies.find(p => p.id === selectedPolicyId) || policies[0];
    if (!activePolicy) {
        return <div className="max-w-6xl mx-auto px-6 py-24 text-center text-muted-foreground">Loading the plan catalog…</div>;
    }
    const categories = [...new Set(policies.map(p => p.category))];
    const inclusions = activePolicy.features ?? [];
    const exclusions = activePolicy.exclusions ?? [];

    const formatCurrency = formatINR;

    const annualCost = activePolicy.monthlyPremium * 12;

    return (
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 bg-background text-foreground font-sans">
            {/* Policy Switcher Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
                {categories.map(category => (
                    <button
                        key={category}
                        onClick={() => setSelectedPolicyId(policies.find(p => p.category === category)!.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0 border ${activePolicy.category === category
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                    >
                        {category}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mt-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mr-2 shrink-0">Plan:</span>
                {policies.filter(p => p.category === activePolicy.category).map(p => {
                    const isSelected = p.id === activePolicy.id;
                    return (
                        <button
                            key={p.id}
                            onClick={() => setSelectedPolicyId(p.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                                : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                        >
                            {p.title}
                        </button>
                    );
                })}
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <header className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-blue-200 dark:border-blue-800 text-blue-600 bg-blue-50 dark:bg-blue-900/20 font-bold uppercase tracking-widest text-[10px]">
                            {activePolicy.category} · Sample Plan
                        </Badge>
                        <Badge className="bg-emerald-500 text-white border-none font-bold text-[10px] tracking-widest uppercase">
                            Clarity Score {activePolicy.clarityScore ?? '—'}/100
                        </Badge>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight">{activePolicy.title}</h1>
                    <p className="text-muted-foreground font-medium">
                        Policy ID: {activePolicy.id} • {activePolicy.provider} • {activePolicy.category} Protection
                    </p>
                    {activePolicy.structure && <p className="text-sm text-foreground font-medium">{activePolicy.structure}</p>}
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                        {activePolicy.bestFor && <span><span className="font-bold text-foreground">Best for:</span> {activePolicy.bestFor}</span>}
                        {activePolicy.waitingPeriod && <span><span className="font-bold text-foreground">Waiting period:</span> {activePolicy.waitingPeriod}</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Sample plan; premium quoted for a reference 35-year-old. See Compare for your personal quotes.</p>
                </header>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentScreen('savedplans')}
                        className="h-12 px-6 font-bold"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Saved Plans
                    </Button>
                    <Button
                        onClick={() => setCurrentScreen('comparison')}
                        className="h-12 px-6 font-bold bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Compare Variants
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Quick Stats */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
                        <Card className="shadow-sm border-border">
                            <CardContent className="p-6">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Sum Assured</p>
                                <p className="text-xl font-black text-blue-600">{formatCurrency(activePolicy.coverageAmount)}</p>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-border">
                            <CardContent className="p-6">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Premium / Yr</p>
                                <p className="text-xl font-black text-foreground">{formatINR(annualCost)}</p>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-border">
                            <CardContent className="p-6">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Sold By</p>
                                <p className="text-sm font-bold text-foreground">{activePolicy.provider}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="p-8 shadow-sm border-border">
                        <CardHeader className="p-0 mb-8 border-b border-border pb-6 flex flex-row justify-between items-center">
                            <CardTitle className="text-xl font-bold">Benefit Structural Analysis</CardTitle>
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Actuarial Verification</span>
                        </CardHeader>
                        <CardContent className="p-0 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h4 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Inclusions & Features
                                    </h4>
                                    <ul className="space-y-4">
                                        {inclusions.map((item, i) => (
                                            <li key={i} className="flex gap-3 text-sm font-medium text-foreground/80">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <XCircle className="w-4 h-4 text-red-500" />
                                        Exclusion Clauses
                                    </h4>
                                    <ul className="space-y-4">
                                        {exclusions.map((item, i) => (
                                            <li key={i} className="flex gap-3 text-sm font-medium text-muted-foreground italic opacity-80">
                                                <div className="w-1.5 h-1.5 rounded-full bg-muted mt-1.5 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl">
                                <h4 className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-[0.2em] mb-4">ShieldIQ Intelligence Insights</h4>
                                <div className="flex gap-4">
                                    <div className="bg-blue-600 p-2 rounded-xl h-fit">
                                        <Zap className="w-5 h-5 text-white" />
                                    </div>
                                    <p className="text-sm text-blue-900/70 dark:text-blue-200/60 leading-relaxed font-medium italic">
                                        "The clauses defined in {activePolicy.title} feature zero hidden deductible riders. We suggest utilizing the multi-tier benefit rider to index sum assured alongside inflation."
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar - Risk Profile & Contact */}
                <div className="space-y-8">
                    <Card className="bg-primary text-primary-foreground p-8 border-none shadow-2xl">
                        <CardHeader className="p-0 mb-6">
                            <h3 className="text-xs font-black text-blue-400 dark:text-blue-300 uppercase tracking-[0.2em]">Compliance Score</h3>
                        </CardHeader>
                        <CardContent className="p-0 space-y-6">
                            <div className="flex items-center gap-6">
                                <div className="text-5xl font-black font-mono">{activePolicy.clarityScore ?? '—'}</div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-primary-foreground/70 uppercase">Tier: {(activePolicy.clarityScore ?? 0) >= 90 ? 'High clarity' : (activePolicy.clarityScore ?? 0) >= 80 ? 'Good clarity' : 'Read carefully'}</p>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-3 h-1 bg-blue-600 rounded-full" />)}
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-primary-foreground/70 leading-relaxed font-mono">
                                Clarity reflects how plainly the wording states benefits and exclusions. Compare insurers' official IRDAI claim records under Plan Options.
                            </p>
                            <Button
                                onClick={() => setCurrentScreen('comparison')}
                                className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-bold h-12 uppercase tracking-widest text-[10px]"
                            >
                                Verify Against Benchmark
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="p-8 space-y-6 border-border shadow-sm">
                        <h4 className="text-sm font-bold">Before You Buy</h4>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h5 className="text-sm font-bold">Check the policy wording</h5>
                                <p className="text-xs text-muted-foreground">{exclusions.length} exclusions to review above</p>
                            </div>
                        </div>
                        <div className="space-y-3 pt-2">
                            <p className="text-xs text-muted-foreground italic">Confirm waiting periods, sub-limits and exclusions in the insurer's policy document; this summary is not the contract.</p>
                            <Button
                                variant="ghost"
                                onClick={() => setCurrentScreen('affordability')}
                                className="w-full justify-start text-blue-600 text-xs font-bold p-0 h-auto hover:bg-transparent"
                            >
                                View Affordability & Cashflow Impact
                                <ExternalLink className="w-3 h-3 ml-2" />
                            </Button>
                        </div>
                    </Card>

                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 p-6 rounded-2xl flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase leading-relaxed font-mono">
                            Disclaimer: Analytical simulation only. Claims are subject to specific policy wordings and underwriting at the time of issuance.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
