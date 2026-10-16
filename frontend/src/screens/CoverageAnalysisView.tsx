import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Download, Activity, BookmarkPlus, CheckCircle2 } from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi } from '@/lib/api';
import { formatINR } from '@/lib/utils';
import { AiStrategyPanel } from '@/components/AiStrategyPanel';

const ratingBadge: Record<string, string> = {
    Optimal: 'bg-emerald-500',
    Adequate: 'bg-blue-600',
    Vulnerable: 'bg-amber-500',
    'High Risk': 'bg-red-500',
};

export const CoverageAnalysisView: React.FC = () => {
    const { strategy, user, setCurrentScreen } = useApp();
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    if (!strategy) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-24 text-center space-y-4">
                <h1 className="text-3xl font-black tracking-tight">Coverage Gap & Affordability</h1>
                <p className="text-muted-foreground">
                    {user.onboardingCompleted ? 'Loading your analysis…' : 'Complete your financial profile to see your coverage gaps.'}
                </p>
                {!user.onboardingCompleted && (
                    <Button onClick={() => setCurrentScreen('onboarding')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">Complete Profile</Button>
                )}
            </div>
        );
    }

    const { life, health, affordability } = strategy;
    const ratio = (have: number, need: number) => (need > 0 ? Math.min(100, Math.round((have / need) * 100)) : 100);
    const budgetFit = affordability.estimatedAnnualPremium > 0 ? ratio(affordability.premiumBudget, affordability.estimatedAnnualPremium) : 100;
    const waterfallMax = Math.max(life.totalNeed, life.existing, 1);
    const bars = [
        { label: 'Income', value: life.humanLifeValue, color: 'bg-blue-300 dark:bg-blue-800' },
        { label: 'Loans', value: life.liabilities, color: 'bg-amber-400/70' },
        { label: 'Education', value: life.educationCorpus, color: 'bg-amber-400/40' },
        { label: 'Total Need', value: life.totalNeed, color: 'bg-blue-100 dark:bg-blue-900/30 border-t-2 border-blue-600' },
        { label: 'Existing', value: life.existing, color: 'bg-blue-600' },
        { label: 'Gap', value: life.gap, color: 'bg-red-500/80' },
    ];

    const handleSave = async () => {
        const res = await ShieldIQApi.createPlan({
            name: `Coverage audit ${new Date().toLocaleDateString('en-IN')}`,
            category: 'Portfolio Audit',
            coverageAmount: life.totalNeed + health.recommendedCover,
            monthlyPremium: Math.round(affordability.estimatedAnnualPremium / 12),
            status: strategy.rating === 'Optimal' || strategy.rating === 'Adequate' ? 'Adequate' : 'Gap Detected',
            description: `Score ${strategy.score}/100. Life gap ${formatINR(life.gap)}, health gap ${formatINR(health.gap)}. Closing both costs about ${formatINR(affordability.estimatedAnnualPremium)} a year.`,
        });
        setSaveMessage(res && res.success ? 'Saved to your plans.' : res?.error || 'Could not save. Please try again.');
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-10 font-sans bg-background text-foreground">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <header className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-blue-200 dark:border-blue-800 text-blue-600 bg-blue-50 dark:bg-blue-900/20 font-black uppercase tracking-widest text-[10px] px-3">Protection Audit</Badge>
                        <Badge className={`${ratingBadge[strategy.rating]} text-white border-none font-black text-[10px] tracking-widest uppercase px-3`}>{strategy.rating}</Badge>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight">Coverage Gap & Affordability</h1>
                    <p className="text-muted-foreground font-medium max-w-2xl text-lg">
                        Your life and health protection measured against what your household actually needs.
                    </p>
                </header>
                <div className="flex gap-3 print:hidden">
                    <Button variant="outline" onClick={() => window.print()} className="h-12 px-6 font-bold">
                        <Download className="w-4 h-4 mr-2" /> Print Report
                    </Button>
                    <Button onClick={handleSave} className="h-12 px-6 font-bold bg-blue-600 hover:bg-blue-700 text-white">
                        <BookmarkPlus className="w-4 h-4 mr-2" /> Save as Plan
                    </Button>
                </div>
            </div>
            {saveMessage && (
                <p role="status" className="flex items-center gap-2 text-sm font-medium text-emerald-600"><CheckCircle2 className="w-4 h-4" />{saveMessage}</p>
            )}

            {/* Global Status Bar */}
            <Card className="border-border shadow-2xl bg-card overflow-hidden relative">
                <CardHeader className="p-0">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Activity className="w-40 h-40 text-blue-500" />
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8 relative z-10">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">Protection Score</h3>
                            <p className="text-sm font-medium text-muted-foreground">60% life adequacy, 40% health adequacy</p>
                        </div>
                        <div className="text-right flex items-baseline gap-2">
                            <span className="text-5xl font-black text-blue-600 font-mono">{strategy.score}</span>
                            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">/ 100</span>
                        </div>
                    </div>
                    <div className="relative h-12 w-full bg-muted rounded-full overflow-hidden border border-border">
                        <div className="absolute inset-y-0 left-0 bg-blue-600 flex items-center justify-center text-[10px] font-black text-white px-6 uppercase tracking-widest transition-all duration-1000 whitespace-nowrap overflow-hidden" style={{ width: `${strategy.score}%` }}>
                            {strategy.score >= 25 && 'Covered'}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { label: 'Life Protection', val: ratio(life.existing, life.totalNeed), detail: `${formatINR(life.existing)} of ${formatINR(life.totalNeed)}` },
                            { label: 'Health Depth', val: ratio(health.existing, health.recommendedCover), detail: `${formatINR(health.existing)} of ${formatINR(health.recommendedCover)}` },
                            { label: 'Premium Affordability', val: budgetFit, detail: `${formatINR(affordability.premiumBudget)} budget vs ${formatINR(affordability.estimatedAnnualPremium)} needed` },
                        ].map(cat => (
                            <div key={cat.label} className="space-y-3">
                                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                                    <span>{cat.label}</span>
                                    <span className={cat.val < 50 ? "text-amber-500" : "text-foreground"}>{cat.val}%</span>
                                </div>
                                <Progress value={cat.val} className={`h-1.5 ${cat.val < 50 ? "bg-amber-500/10" : ""}`} />
                                <p className="text-[10px] font-medium text-muted-foreground">{cat.detail}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Waterfall Chart Card */}
                    <Card className="border-border">
                        <CardHeader className="p-8 pb-3">
                            <div className="flex justify-between items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl font-black uppercase tracking-tight">Life Gap Breakdown</CardTitle>
                                    <CardDescription className="text-xs font-bold uppercase tracking-widest">Income replacement, debts and education vs existing cover.</CardDescription>
                                </div>
                                <Badge className="bg-primary text-primary-foreground font-black shrink-0">{life.gap > 0 ? `${formatINR(life.gap)} Gap` : 'No Gap'}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 pt-0">
                            <div className="h-64 flex items-end justify-between gap-2 px-2 pb-2 border-b border-border/50">
                                {bars.map(bar => (
                                    <div key={bar.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                        <span className="text-[10px] font-mono font-bold text-foreground">{formatINR(bar.value)}</span>
                                        <div className={`w-full max-w-16 rounded-t-sm transition-all duration-700 ${bar.color}`} style={{ height: `${(bar.value / waterfallMax) * 80}%` }} />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between gap-2 px-2 pt-3">
                                {bars.map(bar => (
                                    <span key={bar.label} className="flex-1 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">{bar.label}</span>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Affordability */}
                    <Card className="p-8 space-y-8">
                        <div className="flex justify-between items-center gap-4">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-foreground tracking-tight uppercase">Affordability</h3>
                                <p className="text-sm text-muted-foreground font-medium">What closing every gap would cost against your income.</p>
                            </div>
                            <div className={`px-4 py-2 rounded-xl flex items-center gap-2 border ${budgetFit >= 100 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50 text-emerald-600' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50 text-amber-600'}`}>
                                <div className={`w-2 h-2 rounded-full ${budgetFit >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{budgetFit >= 100 ? 'Within Budget' : 'Over Budget'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: 'Premium to Close Gaps', val: formatINR(affordability.estimatedAnnualPremium), desc: '/ year' },
                                { label: 'Premium Ratio', val: `${affordability.premiumToIncomeRatio}%`, desc: 'Target < 10%' },
                                { label: 'Expense Ratio', val: `${affordability.expenseRatio}%`, desc: 'of gross income' },
                            ].map(stat => (
                                <div key={stat.label} className="p-6 bg-muted/30 border border-border rounded-2xl space-y-1">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black font-mono text-foreground">{stat.val}</span>
                                        <span className="text-[10px] font-bold text-muted-foreground">{stat.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Keep an emergency fund of {formatINR(affordability.emergencyFundTarget)} (6 months of expenses) alongside insurance.
                        </p>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    <AiStrategyPanel />

                    <Card className="p-8 space-y-6 border-border">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assumptions Used</h4>
                        <div className="space-y-3">
                            {[
                                { label: 'Retirement Age', val: `${strategy.assumptions.retirementAge}` },
                                { label: 'Salary Growth', val: `${strategy.assumptions.salaryGrowth}% / yr` },
                                { label: 'Return on Payout', val: `${strategy.assumptions.discountRate}% / yr` },
                                { label: 'Education per Child', val: formatINR(strategy.assumptions.educationCorpusPerChild) },
                                { label: 'Premium Budget', val: `${strategy.assumptions.premiumBudgetShare * 100}% of income` },
                            ].map(param => (
                                <div key={param.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                                    <div className="flex items-center gap-3">
                                        <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{param.label}</span>
                                    </div>
                                    <span className="text-[10px] font-black font-mono text-foreground uppercase tracking-widest">{param.val}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
