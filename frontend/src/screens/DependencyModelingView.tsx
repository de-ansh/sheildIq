import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
    GraduationCap,
    Home,
    Users,
    CheckCircle2,
    Settings2,
    ArrowRight
} from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi } from '@/lib/api';
import { FamilyPlan } from '@/components/FamilyPlan';
import { useI18n } from '@/lib/i18n';
import { formatINR } from '@/lib/utils';
import { EDUCATION_PER_CHILD, householdOf, inEducation } from '@/lib/household';

const RETIREMENT_AGE = 60;
// Child ages aren't collected, so education spending is spread over the next 15 years.
const EDUCATION_WINDOW_YEARS = 15;
// Used when the profile has no years-left figure for the home loan.
const DEFAULT_LOAN_TENURE_YEARS = 20;

type Status = 'critical' | 'moderate' | 'normal' | 'surplus';

export const DependencyModelingView: React.FC = () => {
    const { user, setCurrentScreen } = useApp();
    const { t } = useI18n();

    const [inflationRate, setInflationRate] = useState<number[]>([6]);
    const [interestRate, setInterestRate] = useState<number[]>([8.5]);
    const [educationMultiplier, setEducationMultiplier] = useState<number[]>([1.0]);
    const [incomeReplacement, setIncomeReplacement] = useState<number | null>(null);

    // Children and siblings still in education.
    const children = inEducation(householdOf(user));
    const workingYears = Math.max(1, RETIREMENT_AGE - user.age);
    const loans = user.homeLoan + user.otherLoans;
    // All loans run down over the home loan's remaining term (the largest loan for most households).
    const loanTenure = user.homeLoanYearsLeft || DEFAULT_LOAN_TENURE_YEARS;
    // Funds the family could draw on: life cover plus liquid savings.
    const cover = user.existingLifeCover + user.liquidSavings;
    const startYear = new Date().getFullYear();

    // Income replacement comes from the same engine as every other screen.
    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            if (user.income <= 0) {
                setIncomeReplacement(0);
                return;
            }
            const res = await ShieldIQApi.calculateHLV({
                income: user.income, years: workingYears, inflation: inflationRate[0],
                spouseIncome: user.spouseIncome, monthlyExpenses: user.monthlyExpenses,
            });
            if (!cancelled && res && res.success && res.data) setIncomeReplacement(res.data.recommendedCover);
        }, 150);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [user.income, workingYears, inflationRate, user.spouseIncome, user.monthlyExpenses]);

    const projections = useMemo(() => {
        const inf = inflationRate[0] / 100;
        const r = interestRate[0] / 100;
        const hlv = incomeReplacement ?? 0;
        const educationToday = children * EDUCATION_PER_CHILD * educationMultiplier[0];

        // Remaining loan principal after t years of a level EMI.
        const loanBalance = (t: number) => {
            if (loans <= 0 || t >= loanTenure) return 0;
            if (r === 0) return loans * (1 - t / loanTenure);
            const n = loanTenure;
            return loans * (Math.pow(1 + r, n) - Math.pow(1 + r, t)) / (Math.pow(1 + r, n) - 1);
        };
        // Education still to be paid in year t, in that year's money.
        const educationRemaining = (t: number) =>
            t >= EDUCATION_WINDOW_YEARS ? 0 : educationToday * (1 - t / EDUCATION_WINDOW_YEARS) * Math.pow(1 + inf, t);
        // Income replacement still needed: shrinks linearly as working years run out.
        const incomeRemaining = (t: number) => (t >= workingYears ? 0 : hlv * (1 - t / workingYears));

        const span = Math.min(30, Math.max(workingYears, 10));
        const step = Math.max(1, Math.round(span / 6));
        const timeline = Array.from({ length: 7 }, (_, i) => {
            const t = Math.min(span, i * step);
            const obligation = incomeRemaining(t) + loanBalance(t) + educationRemaining(t);
            const coverRatio = obligation > 0 ? cover / obligation : Infinity;
            const status: Status = coverRatio < 0.5 ? 'critical' : coverRatio < 0.9 ? 'moderate' : coverRatio < 1.5 ? 'normal' : 'surplus';
            return { t, year: startYear + t, age: user.age + t, obligation, gap: Math.max(0, obligation - cover), status };
        });
        const peak = timeline.reduce((max, m) => (m.gap > max.gap ? m : max), timeline[0]);

        return {
            timeline,
            peak,
            totalLifetimeLiability: Math.round(timeline[0].obligation),
            baseEducation: Math.round(educationToday),
            baseIncome: Math.round(hlv),
            baseLoans: loans,
            maxObligation: Math.max(1, ...timeline.map(m => m.obligation)),
        };
    }, [inflationRate, interestRate, educationMultiplier, incomeReplacement, children, loans, cover, workingYears, startYear, user.age, loanTenure]);

    const coveredBadge = (amount: number) =>
        amount === 0
            ? { text: t('dm.notNeeded'), cls: 'bg-muted text-muted-foreground' }
            : cover >= projections.totalLifetimeLiability
                ? { text: t('dm.coveredExisting'), cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' }
                : { text: t('dm.partOfGap', { amount: formatINR(projections.totalLifetimeLiability - cover) }), cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' };

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 text-foreground font-sans">
            <FamilyPlan />

            {/* Second half of the Family screen: a section, not a second page. */}
            <section aria-labelledby="dependency-heading" className="space-y-1 pt-8 border-t border-border">
                <h2 id="dependency-heading" className="text-2xl font-black tracking-tight text-foreground">{t('dm.title')}</h2>
                <p className="text-muted-foreground text-sm font-medium">
                    {t('dm.subtitle', { name: user.name, age: user.age, cover: formatINR(cover) })}
                </p>
            </section>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card className="border-border shadow-sm p-6">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        {t('dm.obligations')}
                    </span>
                    <div className="text-3xl font-black font-mono tracking-tight text-foreground mt-2">
                        {incomeReplacement === null ? '—' : formatINR(projections.totalLifetimeLiability)}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-2">
                        {t('dm.obligationsSub')}
                    </p>
                </Card>

                <Card className="border-border shadow-sm p-6">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        {t('dm.peak')}
                    </span>
                    <div className={`text-3xl font-black font-mono tracking-tight mt-2 flex items-baseline gap-2 ${projections.peak.gap > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        {projections.peak.gap > 0 ? projections.peak.year : t('dm.none')}
                        {projections.peak.gap > 0 && (
                            <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-none text-xs font-bold uppercase tracking-wider">
                                {t('dm.age', { age: projections.peak.age })}
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-2">
                        {projections.peak.gap > 0
                            ? t('dm.peakGap', { amount: formatINR(projections.peak.gap) })
                            : t('dm.peakNone')}
                    </p>
                </Card>

                <Card className="border-border shadow-sm p-6">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        {t('dm.inflation')}
                    </span>
                    <div className="text-3xl font-black font-mono tracking-tight text-blue-600 mt-2">
                        {inflationRate[0].toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-2">{t('dm.inflationSub')}</p>
                </Card>
            </div>

            {/* Dependency Heatmap / 30-Year Timeline */}
            <Card className="border-border shadow-sm p-8 space-y-8">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <CardTitle className="text-lg font-black tracking-tight">{t('dm.heatmap')}</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            {t('dm.heatmapSub', { cover: formatINR(cover) })}
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded bg-red-500" /> {t('dm.legend.critical')}
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded bg-amber-500" /> {t('dm.legend.standard')}
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded bg-blue-500" /> {t('dm.legend.minimal')}
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> {t('dm.legend.surplus')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Visual Bar Timeline */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                        {projections.timeline.map((ms) => {
                            const isPeak = ms.gap > 0 && ms.year === projections.peak.year;
                            const load = Math.round((ms.obligation / projections.maxObligation) * 100);
                            let barColor = 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30';
                            if (ms.status === 'critical') barColor = 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/50';
                            else if (ms.status === 'moderate') barColor = 'bg-amber-500/20 text-amber-800 dark:text-amber-400 border-amber-500/40';
                            else if (ms.status === 'surplus') barColor = 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border-emerald-500/40';

                            return (
                                <div
                                    key={ms.year}
                                    className={`p-4 rounded-xl border ${barColor} flex flex-col justify-between h-36 transition-all hover:scale-[1.02]`}
                                >
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-mono font-bold">{ms.year}</span>
                                            {isPeak && (
                                                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                            )}
                                        </div>
                                        <p className="text-xs font-bold leading-tight line-clamp-2">
                                            {t('dm.cell', { age: ms.age, amount: formatINR(ms.obligation) })}
                                        </p>
                                    </div>

                                    <div className="space-y-1 mt-auto pt-3">
                                        <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${ms.status === 'critical' ? 'bg-red-500' : ms.status === 'moderate' ? 'bg-amber-500' : ms.status === 'surplus' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                style={{ width: `${load}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono font-bold block text-right">
                                            {ms.gap > 0 ? t('dm.cellGap', { amount: formatINR(ms.gap) }) : t('dm.covered')}
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
                        <h3 className="text-lg font-black tracking-tight text-foreground">
                            {t('dm.goals')}
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium">
                            {t('dm.goalsSub')}
                        </p>
                    </div>

                    <Card className="border-border shadow-sm p-6 hover:border-blue-500/40 transition-all">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 mt-1">
                                    <GraduationCap className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-base text-foreground">{t('dm.education')}</h4>
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {t('dm.educationSub', { count: children === 1 ? t('dm.dependent') : t('dm.dependents', { n: children }), each: formatINR(EDUCATION_PER_CHILD * educationMultiplier[0]), years: EDUCATION_WINDOW_YEARS })}
                                    </p>
                                    <div className="flex items-center gap-2 pt-2">
                                        <Badge className={`${coveredBadge(projections.baseEducation).cls} border-none text-xs font-bold`}>
                                            {coveredBadge(projections.baseEducation).text}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right font-mono">
                                <span className="text-2xl font-black text-foreground">
                                    {formatINR(projections.baseEducation)}
                                </span>
                                <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider mt-0.5">
                                    {t('dm.todayCost')}
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
                                    <h4 className="font-bold text-base text-foreground">{t('dm.income')}</h4>
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {t('dm.incomeSub', { from: startYear, to: startYear + workingYears, years: workingYears })}
                                    </p>
                                    <div className="flex items-center gap-2 pt-2">
                                        <Badge className={`${coveredBadge(projections.baseIncome).cls} border-none text-xs font-bold`}>
                                            {coveredBadge(projections.baseIncome).text}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right font-mono">
                                <span className="text-2xl font-black text-foreground">
                                    {incomeReplacement === null ? '—' : formatINR(projections.baseIncome)}
                                </span>
                                <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider mt-0.5">
                                    {t('dm.npv')}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="border-border shadow-sm p-6 hover:border-blue-500/40 transition-all">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 mt-1">
                                    <Home className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-base text-foreground">{t('dm.debt')}</h4>
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {t('dm.debtSub', { home: formatINR(user.homeLoan), other: formatINR(user.otherLoans), years: loanTenure, rate: interestRate[0].toFixed(1) })}
                                    </p>
                                    <div className="flex items-center gap-2 pt-2">
                                        <Badge className={`${coveredBadge(projections.baseLoans).cls} border-none text-xs font-bold`}>
                                            {coveredBadge(projections.baseLoans).text}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right font-mono">
                                <span className="text-2xl font-black text-foreground">
                                    {formatINR(projections.baseLoans)}
                                </span>
                                <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider mt-0.5">
                                    {t('dm.principal')}
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
                            <CardTitle className="text-lg font-black tracking-tight">{t('dm.assumptions')}</CardTitle>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <Label>{t('dm.generalInflation')}</Label>
                                <span className="text-blue-600 font-mono font-bold text-sm">{inflationRate[0].toFixed(1)}%</span>
                            </div>
                            <Slider aria-label={t('dm.generalInflation')}
                                value={inflationRate}
                                onValueChange={setInflationRate}
                                max={10}
                                min={1}
                                step={0.1}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground font-mono">
                                <span>1.0%</span>
                                <span>5.0%</span>
                                <span>10.0%</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <Label>{t('dm.loanRate')}</Label>
                                <span className="text-blue-600 font-mono font-bold text-sm">{interestRate[0].toFixed(1)}%</span>
                            </div>
                            <Slider aria-label={t('dm.loanRate')}
                                value={interestRate}
                                onValueChange={setInterestRate}
                                max={12}
                                min={2}
                                step={0.2}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground font-mono">
                                <span>2.0%</span>
                                <span>7.0%</span>
                                <span>12.0%</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <Label>{t('dm.eduMultiplier')}</Label>
                                <span className="text-blue-600 font-mono font-bold text-sm">{educationMultiplier[0].toFixed(2)}x</span>
                            </div>
                            <Slider aria-label={t('dm.eduMultiplier')}
                                value={educationMultiplier}
                                onValueChange={setEducationMultiplier}
                                max={2.5}
                                min={1.0}
                                step={0.05}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground font-mono">
                                <span>1.00x</span>
                                <span>1.75x</span>
                                <span>2.50x</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                            <CheckCircle2 className="w-4 h-4" />
                            {t('dm.live')}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                            {t('dm.liveBody', { eduYears: EDUCATION_WINDOW_YEARS, loanYears: loanTenure })}
                            {user.homeLoanYearsLeft ? '' : t('dm.loanHint')}
                        </p>
                    </div>

                    <Button
                        onClick={() => setCurrentScreen('calculator')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 group"
                    >
                        {t('dm.openCalc')}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </Card>
            </div>
        </div>
    );
};
