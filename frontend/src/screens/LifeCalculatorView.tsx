import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    AlertTriangle,
    Settings,
    ShieldCheck,
    BrainCircuit,
    Info,
    ArrowRight,
    FileDown,
    BookmarkPlus,
    CheckCircle2
} from "lucide-react";
import { ShieldIQApi, HLVResult } from '@/lib/api';
import { useApp } from '@/lib/AppContext';
import { formatINR } from '@/lib/utils';
import { EDUCATION_PER_CHILD, householdOf, inEducation } from '@/lib/household';
import { ExplainResult } from '@/components/ExplainResult';
import { useI18n } from '@/lib/i18n';

const RETIREMENT_AGE = 60;

export const LifeCalculatorView: React.FC = () => {
    const { user, setCurrentScreen } = useApp();
    const { t, tServer } = useI18n();

    // Seeded from the user's profile; every input stays editable for what-if analysis.
    const existingCoverTotal = user.existingLifeCover;
    const household = householdOf(user);
    const [income, setIncome] = useState(user.income || 1200000);
    const [years, setYears] = useState(Math.max(1, RETIREMENT_AGE - user.age));
    const [inflation, setInflation] = useState(6.0);
    const [liabilities, setLiabilities] = useState(user.homeLoan + user.otherLoans);
    const [educationFund, setEducationFund] = useState(inEducation(household) * EDUCATION_PER_CHILD);
    const [savings, setSavings] = useState(user.liquidSavings);
    const [hlv, setHlv] = useState<HLVResult | null>(null);
    const [calcError, setCalcError] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const incomeMax = Math.max(10000000, income);

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            const res = await ShieldIQApi.calculateHLV({
                income, years, inflation, existingCover: existingCoverTotal,
                spouseIncome: user.spouseIncome, monthlyExpenses: user.monthlyExpenses,
            });
            if (cancelled) return;
            if (res && res.success && res.data) {
                setHlv(res.data);
                setCalcError(null);
            } else {
                setCalcError(tServer(res?.error) ?? t('lc.engineError'));
            }
        }, 150);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [income, years, inflation, existingCoverTotal, user.spouseIncome, user.monthlyExpenses, t, tServer]);

    // Same rule as the strategy engine: with nobody relying on this income and no debts, there is no income to replace.
    const needsIncomeReplacement = household.count > 0 || liabilities > 0;
    const incomeReplacement = hlv && needsIncomeReplacement ? hlv.recommendedCover : 0;
    // Savings the family can draw on reduce what insurance must provide (same rule as the strategy engine).
    const grossNeed = incomeReplacement + liabilities + educationFund;
    const savingsApplied = Math.min(savings, grossNeed);
    const recommendedCover = hlv ? grossNeed - savingsApplied : 0;
    const coverageGap = Math.max(0, recommendedCover - existingCoverTotal);
    const gapPercentage = recommendedCover > 0 ? Number(((coverageGap / recommendedCover) * 100).toFixed(1)) : 0;
    const assetsCoverPct = recommendedCover > 0 ? Math.min(100, Math.round((existingCoverTotal / recommendedCover) * 100)) : 0;

    // Projected gross income each year until retirement, plotted against today's income.
    const projection = Array.from({ length: years + 1 }, (_, t) => income * Math.pow(1 + inflation / 100, t));
    const peak = projection[projection.length - 1] || 1;
    const toPoint = (v: number, t: number) => `${(t / Math.max(1, years)) * 500},${150 - (v / peak) * 130}`;
    const incomePath = projection.map((v, t) => `${t === 0 ? 'M' : 'L'}${toPoint(v, t)}`).join(' ');

    const handleSavePlan = async () => {
        const res = await ShieldIQApi.createPlan({
            name: `Life cover ${formatINR(recommendedCover)} (${new Date().toLocaleDateString('en-IN')})`,
            category: 'Term Life',
            coverageAmount: recommendedCover,
            monthlyPremium: 0,
            status: coverageGap > 0 ? 'Gap Detected' : 'Adequate',
            description: `Income ${formatINR(income)} for ${years} years at ${inflation.toFixed(1)}% growth, liabilities ${formatINR(liabilities)}, education ${formatINR(educationFund)}. Existing cover ${formatINR(existingCoverTotal)}, gap ${formatINR(coverageGap)}.`,
        });
        setSaveMessage(res && res.success ? t('lc.saved') : tServer(res?.error) ?? t('lc.saveError'));
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 text-foreground font-sans">
            <header className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                    <span>{t('lc.method')}</span>
                </div>
                <h1 className="text-4xl font-black tracking-tight text-foreground">{t('lc.title')}</h1>
                <p className="text-muted-foreground text-lg max-w-2xl">
                    {t('lc.subtitle')}
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Input Panel */}
                <Card className="lg:col-span-5 border-border shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-2 pb-6 border-b border-border mb-6">
                        <Settings className="w-5 h-5 text-blue-600" />
                        <CardTitle className="text-xl font-bold">{t('lc.inputs')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-10">
                        {/* Income Slider */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-foreground">{t('lc.income')}</label>
                                <span className="text-blue-600 font-mono font-bold text-lg">{formatINR(income)}</span>
                            </div>
                            <Slider aria-label={t('lc.income')}
                                value={[income]}
                                max={incomeMax}
                                min={100000}
                                step={50000}
                                onValueChange={(v: number[]) => setIncome(v[0])}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-widest font-bold">
                                <span>₹1L</span>
                                <span>{formatINR(incomeMax)}</span>
                            </div>
                        </div>

                        {/* Years Slider */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-foreground">{t('lc.years')}</label>
                                <span className="text-blue-600 font-mono font-bold text-lg">{t('lc.yearsValue', { years })}</span>
                            </div>
                            <Slider aria-label={t('lc.years')}
                                value={[years]}
                                max={50}
                                min={1}
                                step={1}
                                onValueChange={(v: number[]) => setYears(v[0])}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-widest font-bold">
                                <span>{t('lc.oneYear')}</span>
                                <span>{t('lc.fiftyYears')}</span>
                            </div>
                        </div>

                        {/* Salary growth slider */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-foreground">{t('lc.growth')}</label>
                                <span className="text-blue-600 font-mono font-bold text-lg">{inflation.toFixed(1)}%</span>
                            </div>
                            <Slider aria-label={t('lc.growth')}
                                value={[inflation]}
                                max={15}
                                min={0}
                                step={0.5}
                                onValueChange={(v: number[]) => setInflation(v[0])}
                            />
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-lg flex items-start gap-2">
                                <Info className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5" />
                                <p className="text-xs text-amber-700 dark:text-amber-400 italic font-medium">{t('lc.growthNote')}</p>
                            </div>
                        </div>

                        {/* Secondary Inputs */}
                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
                            <div className="space-y-2">
                                <label htmlFor="liabilities-input" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('lc.liabilities')}</label>
                                <Input
                                    id="liabilities-input"
                                    type="number"
                                    className="font-mono text-sm bg-muted/30"
                                    value={liabilities || ''}
                                    onChange={(e) => setLiabilities(Number(e.target.value) || 0)}
                                    placeholder="e.g. 4500000"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="education-fund-input" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('lc.education')}</label>
                                <Input
                                    id="education-fund-input"
                                    type="number"
                                    className="font-mono text-sm bg-muted/30"
                                    value={educationFund || ''}
                                    onChange={(e) => setEducationFund(Number(e.target.value) || 0)}
                                    placeholder="e.g. 2500000"
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label htmlFor="savings-fund-input" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('lc.savings')}</label>
                                <Input
                                    id="savings-fund-input"
                                    type="number"
                                    className="font-mono text-sm bg-muted/30"
                                    value={savings || ''}
                                    onChange={(e) => setSavings(Number(e.target.value) || 0)}
                                    placeholder="e.g. 1000000"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results Panel */}
                <div className="lg:col-span-7 space-y-8">
                    <Card className="border-t-4 border-t-blue-600 shadow-md">
                        <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
                                <div className="space-y-1">
                                    <h3 className="text-xs font-bold text-muted-foreground tracking-widest">{t('lc.required')}</h3>
                                    <div className="text-5xl md:text-6xl font-black text-blue-600 tracking-tighter font-mono">
                                        {hlv ? formatINR(recommendedCover) : '—'}
                                    </div>
                                </div>
                            </div>
                            <p className="mt-6 text-sm text-muted-foreground leading-relaxed font-medium">
                                {savingsApplied > 0
                                    ? t('lc.basisSavings', { years, growth: inflation.toFixed(1), savings: formatINR(savingsApplied) })
                                    : t('lc.basis', { years, growth: inflation.toFixed(1) })}
                            </p>
                            {calcError && (
                                <p role="alert" className="mt-3 text-sm font-medium text-red-600">{calcError}</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="p-8 space-y-8">
                        <h4 className="text-lg font-bold text-foreground">{t('lc.graph')}</h4>

                        <div className="relative h-48 w-full border-b-2 border-border">
                            {/* SVG Chart */}
                            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none" role="img" aria-label={t('lc.graphAria', { from: formatINR(income), to: formatINR(peak) })}>
                                <path d={incomePath} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                                <path d={`M${toPoint(income, 0)} L${toPoint(income, years)}`} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" className="text-muted-foreground" vectorEffect="non-scaling-stroke" />
                            </svg>
                            <div className="absolute top-0 right-0 text-xs font-bold text-blue-600 font-mono">{formatINR(peak)}/yr</div>
                            <div className="absolute -bottom-6 left-0 text-xs font-bold text-muted-foreground uppercase">Today · {formatINR(income)}/yr</div>
                            <div className="absolute -bottom-6 right-0 text-xs font-bold text-muted-foreground uppercase">Retirement ({years}Y)</div>
                        </div>

                        <div className="space-y-6 pt-4">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('lc.gapAnalysis')}</h4>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span>{t('lc.target')}</span>
                                        <span className="font-mono font-black">{formatINR(recommendedCover)}</span>
                                    </div>
                                    <div className="h-4 w-full bg-blue-500/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600 w-full" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-muted-foreground">
                                        <span>{t('lc.existing')}</span>
                                        <span className="font-mono font-black text-foreground">{formatINR(existingCoverTotal)}</span>
                                    </div>
                                    <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 transition-all duration-300"
                                            style={{ width: `${assetsCoverPct}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            {coverageGap > 0 ? (
                                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                                        <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                                            {t('lc.gapFound', { pct: gapPercentage, amount: formatINR(coverageGap) })}
                                        </span>
                                    </div>
                                </div>
                            ) : hlv && (
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-xl flex items-center gap-3">
                                    <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                        {t('lc.enough')}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="bg-muted/30 border-border p-8">
                        <div className="flex items-center gap-2 mb-6">
                            <BrainCircuit className="w-6 h-6 text-blue-600" />
                            <CardTitle className="text-lg font-bold">{t('lc.drivers')}</CardTitle>
                        </div>
                        <div className="space-y-6">
                            {[
                                {
                                    title: t('lc.incomeTitle'),
                                    desc: !hlv
                                        ? t('lc.incomeCalculating')
                                        : needsIncomeReplacement
                                            ? t(user.spouseIncome > 0 ? 'lc.incomeDescSpouse' : 'lc.incomeDesc', { amount: formatINR(incomeReplacement), years, growth: inflation.toFixed(1) })
                                            : t('lc.incomeNone')
                                },
                                {
                                    title: t('lc.loansTitle'),
                                    desc: liabilities > 0
                                        ? t('lc.loansDesc', { amount: formatINR(liabilities) })
                                        : t('lc.loansNone')
                                },
                                {
                                    title: t('lc.eduTitle'),
                                    desc: educationFund > 0
                                        ? t('lc.eduDesc', { amount: formatINR(educationFund) })
                                        : t('lc.eduNone')
                                }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <span className="text-blue-600 font-black pt-0.5">•</span>
                                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                        <strong className="text-foreground font-bold">{item.title}:</strong> {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6">
                            <ExplainResult
                                screen="life-calculator"
                                inputs={{ annualIncome: income, yearsToRetirement: years, salaryGrowthPct: inflation, liabilities, educationFund, savingsDeducted: savingsApplied, existingLifeCover: existingCoverTotal }}
                                result={hlv ? { recommendedCover, incomeReplacement, coverageGap, gapPercentage } : null}
                            />
                        </div>
                    </Card>
                </div>
            </div>

            {saveMessage && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                        <div>
                            <p className="text-sm font-bold">{saveMessage}</p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSaveMessage(null)}
                        className="text-xs font-bold"
                    >
                        {t('lc.dismiss')}
                    </Button>
                </div>
            )}

            {/* Action Footer */}
            <div className="dark bg-slate-900 dark:bg-blue-950 p-10 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-8 mt-12 shadow-2xl">
                <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tight">{t('lc.ctaTitle')}</h3>
                    <p className="opacity-70 font-medium">{t('lc.ctaBody')}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentScreen('comparison')}
                        className="flex-1 md:flex-none border-slate-700 bg-transparent text-white hover:bg-white hover:text-slate-900 h-14 px-8 font-bold"
                    >
                        <FileDown className="w-5 h-5 mr-2" />
                        {t('lc.compare')}
                    </Button>
                    <Button
                        onClick={handleSavePlan}
                        disabled={!hlv}
                        className="flex-1 md:flex-none bg-white text-slate-900 hover:bg-blue-50 h-14 px-8 font-bold group"
                    >
                        <BookmarkPlus className="w-5 h-5 mr-2" />
                        {t('lc.save')}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
