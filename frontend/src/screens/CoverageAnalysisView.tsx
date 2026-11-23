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
import { useI18n } from '@/lib/i18n';

const ratingBadge: Record<string, string> = {
    Optimal: 'bg-emerald-700',
    Adequate: 'bg-blue-600',
    Vulnerable: 'bg-amber-700',
    'High Risk': 'bg-red-600',
};

export const CoverageAnalysisView: React.FC = () => {
    const { strategy, user, setCurrentScreen } = useApp();
    const { t, tServer } = useI18n();
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    if (!strategy) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-24 text-center space-y-4">
                <h1 className="text-3xl font-black tracking-tight">{t('an.title')}</h1>
                <p className="text-muted-foreground">
                    {t(user.onboardingCompleted ? 'an.loading' : 'an.completeFirst')}
                </p>
                {!user.onboardingCompleted && (
                    <Button onClick={() => setCurrentScreen('onboarding')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">{t('an.completeButton')}</Button>
                )}
            </div>
        );
    }

    const { life, health, affordability } = strategy;
    const ratio = (have: number, need: number) => (need > 0 ? Math.min(100, Math.round((have / need) * 100)) : 100);
    const budgetFit = affordability.estimatedAnnualPremium > 0 ? ratio(affordability.premiumBudget, affordability.estimatedAnnualPremium) : 100;
    const waterfallMax = Math.max(life.humanLifeValue, life.totalNeed, life.existing, life.savings, 1);
    const bars = [
        { label: t('an.bar.income'), value: life.humanLifeValue, color: 'bg-blue-300 dark:bg-blue-800' },
        { label: t('an.bar.loans'), value: life.liabilities, color: 'bg-amber-400/70' },
        { label: t('an.bar.education'), value: life.educationCorpus, color: 'bg-amber-400/40' },
        ...(life.savings > 0 ? [{ label: t('an.bar.savings'), value: life.savings, color: 'bg-emerald-500/60' }] : []),
        { label: t('an.bar.totalNeed'), value: life.totalNeed, color: 'bg-blue-100 dark:bg-blue-900/30 border-t-2 border-blue-600' },
        { label: t('an.bar.existing'), value: life.existing, color: 'bg-blue-600' },
        { label: t('an.bar.gap'), value: life.gap, color: 'bg-red-500/80' },
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
        setSaveMessage(res && res.success ? t('an.saved') : tServer(res?.error) ?? t('an.saveError'));
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-10 font-sans bg-background text-foreground">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <header className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-blue-200 dark:border-blue-800 text-blue-600 bg-blue-50 dark:bg-blue-900/20 font-bold uppercase tracking-widest text-xs px-3">{t('an.badge')}</Badge>
                        <Badge className={`${ratingBadge[strategy.rating]} text-white border-none font-bold text-xs tracking-widest uppercase px-3`}>{t(`rating.${strategy.rating}`)}</Badge>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight">{t('an.title')}</h1>
                    <p className="text-muted-foreground font-medium max-w-2xl text-lg">
                        {t('an.subtitle')}
                    </p>
                </header>
                <div className="flex flex-wrap gap-3 print:hidden">
                    <Button variant="outline" onClick={() => window.print()} className="h-12 px-6 font-bold">
                        <Download className="w-4 h-4 mr-2" /> {t('an.print')}
                    </Button>
                    <Button onClick={handleSave} className="h-12 px-6 font-bold bg-blue-600 hover:bg-blue-700 text-white">
                        <BookmarkPlus className="w-4 h-4 mr-2" /> {t('an.save')}
                    </Button>
                </div>
            </div>
            {saveMessage && (
                <p role="status" className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-4 h-4" />{saveMessage}</p>
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
                            <h3 className="text-sm font-black text-muted-foreground tracking-widest">{t('an.score')}</h3>
                            <p className="text-sm font-medium text-muted-foreground">{t('an.weights')}</p>
                        </div>
                        <div className="text-right flex items-baseline gap-2">
                            <span className="text-5xl font-black text-blue-600 font-mono">{strategy.score}</span>
                            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">/ 100</span>
                        </div>
                    </div>
                    <div className="relative h-12 w-full bg-muted rounded-full overflow-hidden border border-border">
                        <div className="absolute inset-y-0 left-0 bg-blue-600 flex items-center justify-center text-xs font-bold text-white px-6 uppercase tracking-widest transition-all duration-1000 whitespace-nowrap overflow-hidden" style={{ width: `${strategy.score}%` }}>
                            {strategy.score >= 25 && t('an.covered')}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { label: t('an.life'), val: ratio(life.existing, life.totalNeed), detail: t('an.of', { held: formatINR(life.existing), need: formatINR(life.totalNeed) }) },
                            { label: t('an.health'), val: ratio(health.existing, health.recommendedCover), detail: t('an.of', { held: formatINR(health.existing), need: formatINR(health.recommendedCover) }) },
                            { label: t('an.affordability'), val: budgetFit, detail: t('an.budgetVs', { budget: formatINR(affordability.premiumBudget), needed: formatINR(affordability.estimatedAnnualPremium) }) },
                        ].map(cat => (
                            <div key={cat.label} className="space-y-3">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    <span>{cat.label}</span>
                                    <span className={cat.val < 50 ? "text-amber-700 dark:text-amber-400" : "text-foreground"}>{cat.val}%</span>
                                </div>
                                <Progress value={cat.val} aria-label={cat.label} className={`h-1.5 ${cat.val < 50 ? "bg-amber-500/10" : ""}`} />
                                <p className="text-xs font-medium text-muted-foreground">{cat.detail}</p>
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
                                    <CardTitle className="text-xl font-black tracking-tight">{t('an.lifeGap')}</CardTitle>
                                    <CardDescription className="text-xs font-bold uppercase tracking-widest">{t('an.lifeGapSub')}</CardDescription>
                                </div>
                                <Badge className="bg-primary text-primary-foreground font-black shrink-0">{life.gap > 0 ? t('an.gapBadge', { amount: formatINR(life.gap) }) : t('an.noGap')}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 pt-0">
                            <div className="h-64 flex items-end justify-between gap-2 px-2 pb-2 border-b border-border/50">
                                {bars.map(bar => (
                                    <div key={bar.label} className="flex-1 min-w-0 flex flex-col items-center gap-2 h-full justify-end">
                                        {/* Wraps "₹2.58 Cr" onto two lines on phones rather than widening the page. */}
                                        <span className="text-xs font-mono font-bold text-foreground text-center leading-tight">{formatINR(bar.value)}</span>
                                        <div className={`w-full max-w-16 rounded-t-sm transition-all duration-700 ${bar.color}`} style={{ height: `${(bar.value / waterfallMax) * 80}%` }} />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between gap-2 px-2 pt-3">
                                {bars.map(bar => (
                                    <span key={bar.label} className="flex-1 min-w-0 break-words text-center text-xs font-bold text-muted-foreground uppercase sm:tracking-widest">{bar.label}</span>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="p-8 space-y-4 border-border">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-foreground tracking-tight">{t('an.illness')}</h3>
                            <p className="text-sm text-muted-foreground font-medium">{t('an.illnessSub')}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { label: t('an.ci'), c: strategy.criticalIllness },
                                { label: t('an.pa'), c: strategy.personalAccident },
                            ].map(({ label, c }) => (
                                <div key={label} className="p-4 bg-muted/30 border border-border rounded-xl space-y-2">
                                    <div className="flex justify-between items-center gap-2">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
                                        <Badge className={`${c.gap > 0 ? 'bg-amber-700' : 'bg-emerald-700'} text-white border-none font-black`}>
                                            {c.gap > 0 ? t('an.gapBadge', { amount: formatINR(c.gap) }) : t('an.covered')}
                                        </Badge>
                                    </div>
                                    <p className="text-sm font-mono">{t('an.suggested', { recommended: formatINR(c.recommended), held: formatINR(c.existing) })}</p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {strategy.parentsHealth && (
                        <Card className="p-8 space-y-4 border-border">
                            <div className="flex justify-between items-center gap-4">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-foreground tracking-tight">{t('an.parents')}</h3>
                                    <p className="text-sm text-muted-foreground font-medium">
                                        {strategy.parentsHealth.count === 1 ? t('an.parentOne', { age: strategy.parentsHealth.eldestAge }) : t('an.parentMany', { count: strategy.parentsHealth.count, age: strategy.parentsHealth.eldestAge })}
                                    </p>
                                </div>
                                <Badge className={`${strategy.parentsHealth.gap > 0 ? 'bg-amber-700' : 'bg-emerald-700'} text-white border-none font-black shrink-0`}>
                                    {strategy.parentsHealth.gap > 0 ? t('an.gapBadge', { amount: formatINR(strategy.parentsHealth.gap) }) : t('an.covered')}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { label: t('an.recommended'), val: formatINR(strategy.parentsHealth.recommendedCover) },
                                    { label: t('an.theyHold'), val: formatINR(strategy.parentsHealth.existing) },
                                    { label: t('an.premiumGap'), val: t('an.perYear', { amount: formatINR(strategy.parentsHealth.estimatedAnnualPremium) }) },
                                ].map(stat => (
                                    <div key={stat.label} className="p-4 bg-muted/30 border border-border rounded-xl">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                                        <p className="text-lg font-black font-mono">{stat.val}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Affordability */}
                    <Card className="p-8 space-y-8">
                        <div className="flex justify-between items-center gap-4">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-foreground tracking-tight">{t('an.afford')}</h3>
                                <p className="text-sm text-muted-foreground font-medium">{t('an.affordSub')}</p>
                            </div>
                            <div className={`px-4 py-2 rounded-xl flex items-center gap-2 border ${budgetFit >= 100 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50 text-amber-700 dark:text-amber-400'}`}>
                                <div className={`w-2 h-2 rounded-full ${budgetFit >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                <span className="text-xs font-bold uppercase tracking-widest">{t(budgetFit >= 100 ? 'an.within' : 'an.over')}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: t('an.premiumGaps'), val: formatINR(affordability.estimatedAnnualPremium), desc: t('an.perYearDesc') },
                                { label: t('an.premiumRatio'), val: `${affordability.premiumToIncomeRatio}%`, desc: t('an.target') },
                                { label: t('an.expenseRatio'), val: `${affordability.expenseRatio}%`, desc: t('an.ofIncome') },
                            ].map(stat => (
                                <div key={stat.label} className="p-6 bg-muted/30 border border-border rounded-2xl space-y-1">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black font-mono text-foreground">{stat.val}</span>
                                        <span className="text-xs font-bold text-muted-foreground">{stat.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('an.emergency', { amount: formatINR(affordability.emergencyFundTarget) })}
                        </p>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    <AiStrategyPanel />

                    <Card className="p-8 space-y-6 border-border">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('an.assumptions')}</h4>
                        <div className="space-y-3">
                            {[
                                { label: t('an.retirement'), val: `${strategy.assumptions.retirementAge}` },
                                { label: t('an.salaryGrowth'), val: t('an.pctYear', { pct: strategy.assumptions.salaryGrowth }) },
                                { label: t('an.return'), val: t('an.pctYear', { pct: strategy.assumptions.discountRate }) },
                                { label: t('an.eduPerChild'), val: formatINR(strategy.assumptions.educationCorpusPerChild) },
                                { label: t('an.budget'), val: t('an.pctIncome', { pct: strategy.assumptions.premiumBudgetShare * 100 }) },
                            ].map(param => (
                                <div key={param.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                                    <div className="flex items-center gap-3">
                                        <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{param.label}</span>
                                    </div>
                                    <span className="text-xs font-bold font-mono text-foreground uppercase tracking-widest">{param.val}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
