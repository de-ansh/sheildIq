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
import { useI18n } from '@/lib/i18n';
import { formatINR } from '@/lib/utils';

// Health premiums in India have been rising ~10% a year; level term premiums stay fixed for the policy term.
const HEALTH_PREMIUM_INFLATION = 0.1;

const getZone = (ratio: number) => {
    if (ratio < 7.0) return { label: 'af.zone.safe' as const, color: 'text-emerald-700 dark:text-emerald-400' };
    if (ratio <= 12.0) return { label: 'af.zone.alert' as const, color: 'text-amber-700 dark:text-amber-400' };
    return { label: 'af.zone.critical' as const, color: 'text-red-600 dark:text-red-400' };
};

export const AffordabilityAnalysisView: React.FC = () => {
    const { user, strategy, setCurrentScreen } = useApp();
    const { t } = useI18n();
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
            // Same route as the plan picks: a top-up on a policy already held, or a new base policy plus top-up.
            strategy.health.gapPlan.id === 'HL-TOPUP-ONLY' && {
                title: t('af.lever.topUpOnly'),
                desc: t('af.lever.topUpOnlyDesc', { held: formatINR(strategy.health.existing), cover: formatINR(strategy.health.gapPlan.cover) }),
                tag: t('af.lever.lowerPremium'),
            },
            strategy.health.gapPlan.id === 'HL-BASE-TOPUP' && {
                title: t('af.lever.baseTopUp'),
                desc: t('af.lever.baseTopUpDesc', { topUp: formatINR(strategy.health.superTopUp), base: formatINR(strategy.health.basePolicy) }),
                tag: t('af.lever.lowerPremium'),
            },
            user.age < 40 && strategy.life.gap > 0 && {
                title: t('af.lever.early'),
                desc: t('af.lever.earlyDesc', { gap: formatINR(strategy.life.gap) }),
                tag: t('af.lever.age'),
            },
            user.lifestyleRisks.some(r => /tobacco|smok/i.test(r)) && {
                title: t('af.lever.tobacco'),
                desc: t('af.lever.tobaccoDesc'),
                tag: t('af.lever.saving'),
            },
            a && a.estimatedAnnualPremium > a.premiumBudget && {
                title: t('af.lever.sequence'),
                desc: t('af.lever.sequenceDesc', { need: formatINR(a.estimatedAnnualPremium), budget: formatINR(a.premiumBudget) }),
                tag: t('af.lever.budget'),
            },
            {
                title: t('af.lever.long'),
                desc: t('af.lever.longDesc'),
                tag: t('af.lever.stability'),
            },
        ].filter(Boolean) as { title: string; desc: string; tag: string }[]
        : [];

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 text-foreground font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-border">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                        <Badge variant="outline" className="text-xs font-mono border-blue-500/30 text-blue-600 bg-blue-50 dark:bg-blue-950/30">
                            {t('af.badge')}
                        </Badge>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground">{t('af.title')}</h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        {t('af.subtitle', { name: user.name })}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto print:hidden">
                    <Button variant="outline" onClick={() => window.print()} className="font-bold border-border">
                        <Download className="w-4 h-4 mr-2" />
                        {t('af.print')}
                    </Button>
                    <Button onClick={() => setCurrentScreen('simulator')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                        <Zap className="w-4 h-4 mr-2" />
                        {t('af.simulate')}
                    </Button>
                </div>
            </div>

            {!strategy && !user.onboardingCompleted && user.isLoggedIn && (
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-sm flex items-center justify-between gap-4">
                    <span>{t('af.completeFirst')}</span>
                    <Button size="sm" onClick={() => setCurrentScreen('onboarding')}>{t('af.completeButton')}</Button>
                </div>
            )}

            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-border shadow-sm">
                    <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('af.pti')}</span>
                        <Activity className="w-4 h-4 text-blue-600" />
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className="text-3xl font-black font-mono tracking-tight text-foreground">{dash(`${ratio}%`)}</div>
                        <p className="text-xs text-muted-foreground font-medium mt-2">{t('af.ptiSub')}</p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('af.dti')}</span>
                        <Landmark className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className="text-3xl font-black font-mono tracking-tight text-foreground">{dash(`${a?.liabilityToIncome}x`)}</div>
                        <p className="text-xs text-muted-foreground font-medium mt-2">
                            {t('af.dtiSub', { amount: formatINR(user.homeLoan + user.otherLoans) })}
                        </p>
                        {a && a.annualEmi > 0 && (
                            <p className={`text-xs font-bold mt-1 ${a.emiToIncomeRatio > 40 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
                                {t('af.emi', { emi: formatINR(user.loanEmi), pct: a.emiToIncomeRatio })}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('af.monthly')}</span>
                        <PieChart className="w-4 h-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className="text-3xl font-black font-mono tracking-tight text-foreground">{dash(formatINR((a?.estimatedAnnualPremium ?? 0) / 12))}</div>
                        <p className="text-xs text-muted-foreground font-medium mt-2">{t('af.monthlySub')}</p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('af.tier')}</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className={`text-2xl font-black uppercase tracking-tight ${strategy ? zone.color : 'text-muted-foreground'}`}>{dash(t(zone.label))}</div>
                        <p className="text-xs text-muted-foreground font-medium mt-2">{t('af.expenses', { pct: dash(`${a?.expenseRatio}%`) })}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Sustainability Zones Gauge & Escalation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Card className="lg:col-span-6 border-border shadow-sm p-8 space-y-6">
                    <div>
                        <CardTitle className="text-lg font-black tracking-tight">{t('af.zones')}</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            {t('af.zonesSub')}
                        </CardDescription>
                    </div>

                    <div className="space-y-4">
                        <div className="h-6 w-full rounded-xl overflow-hidden flex font-mono text-xs font-bold text-white shadow-inner">
                            <div className="bg-emerald-700 w-[35%] flex items-center justify-center">{t('af.zoneSafe')}</div>
                            <div className="bg-amber-700 w-[25%] flex items-center justify-center">{t('af.zoneAlert')}</div>
                            <div className="bg-red-600 w-[40%] flex items-center justify-center">{t('af.zoneCritical')}</div>
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
                                    ? <><CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> {t('af.within')}</>
                                    : <><AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400" /> {t('af.over')}</>}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {t('af.costs', { need: formatINR(a.estimatedAnnualPremium), budget: formatINR(a.premiumBudget) })}{' '}
                                {a.annualSurplus >= 0
                                    ? t('af.surplus', { expenses: formatINR(a.annualExpenses), emi: formatINR(a.annualEmi), left: formatINR(a.annualSurplus) })
                                    : t('af.deficit', { expenses: formatINR(a.annualExpenses), emi: formatINR(a.annualEmi), short: formatINR(-a.annualSurplus) })}
                            </p>
                        </div>
                    )}
                </Card>

                <Card className="lg:col-span-6 border-border shadow-sm p-8 space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight">{t('af.escalation')}</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                {t('af.escalationSub')}
                            </CardDescription>
                        </div>
                        <div className="flex gap-1 bg-muted p-1 rounded-lg">
                            {(['5Y', '10Y'] as const).map(horizon => (
                                <button
                                    key={horizon}
                                    onClick={() => setTimeHorizon(horizon)}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${timeHorizon === horizon ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                                >
                                    {t(`af.horizon.${horizon}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 font-mono">
                        {[
                            { label: t('af.year1'), value: projected(0), note: t('af.baseline'), color: 'text-foreground' },
                            { label: t('af.yearN', { n: 3 }), value: projected(3), note: `+${growth(3)}%`, color: 'text-foreground' },
                            { label: t('af.yearN', { n: horizonYears }), value: projected(horizonYears), note: `+${growth(horizonYears)}%`, color: 'text-foreground' },
                        ].map(item => (
                            <div key={item.label} className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
                                <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">{item.label}</span>
                                <div className={`text-xl font-black ${item.color}`}>{dash(formatINR(item.value))}</div>
                                <span className="text-xs text-muted-foreground font-sans">{strategy ? t('af.perYearNote', { note: item.note }) : ''}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Cost Levers & Premium Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Card className="dark lg:col-span-5 bg-slate-950 text-white p-8 border-none relative overflow-hidden flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-blue-400">
                            <Lightbulb className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase tracking-wider">{t('af.levers')}</span>
                        </div>
                        <div className="space-y-4">
                            {levers.length === 0 && <p className="text-sm text-slate-400">{t('af.loading')}</p>}
                            {levers.map(opt => (
                                <div key={opt.title} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                                    <div className="flex justify-between items-center gap-2">
                                        <h4 className="text-sm font-bold text-white">{opt.title}</h4>
                                        <Badge className="bg-blue-600/30 text-blue-300 border-none text-xs font-bold shrink-0">{opt.tag}</Badge>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">{opt.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Button onClick={() => setCurrentScreen('comparison')} className="w-full mt-6 bg-white text-slate-950 hover:bg-slate-100 font-bold py-6 group">
                        {t('af.compare')}
                        <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Button>
                </Card>

                <Card className="lg:col-span-7 border-border shadow-sm p-8 space-y-6">
                    <div className="flex justify-between items-center gap-4">
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight">{t('af.breakdown')}</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">{t('af.breakdownSub')}</CardDescription>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs shrink-0">{t('af.total', { amount: dash(t('af.perYear', { amount: formatINR(a?.estimatedAnnualPremium ?? 0) })) })}</Badge>
                    </div>

                    <div className="space-y-3">
                        {[
                            { label: t('af.termLife'), gap: strategy?.life.gap ?? 0, premium: lifePremium, screen: 'calculator' as const },
                            { label: t('af.health'), gap: strategy?.health.gap ?? 0, premium: healthPremium, screen: 'healthplanner' as const },
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
                                        <p className="text-xs text-muted-foreground">{t('af.gap', { amount: dash(formatINR(row.gap)) })}</p>
                                    </div>
                                    <div className="flex sm:flex-col items-end justify-between sm:justify-center font-mono">
                                        <span className="text-base font-black text-foreground">{dash(t('af.perYear', { amount: formatINR(row.premium) }))}</span>
                                        <span className="text-xs text-muted-foreground font-sans">{strategy ? t('af.pctTotal', { pct }) : ''}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-xs font-bold text-foreground">{t('af.market')}</span>
                            <p className="text-xs text-muted-foreground">{t('af.marketSub')}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setCurrentScreen('comparison')} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                            {t('af.openCompare')} <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </Card>

                {a?.tax && a.estimatedAnnualPremium > 0 && (
                    <Card className="lg:col-span-12 border-border shadow-sm p-8 space-y-5">
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight">{t('af.tax')}</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                {t('af.taxSub', { year: a.tax.year })}
                            </CardDescription>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="p-5 rounded-xl border border-border space-y-1">
                                <h4 className="text-sm font-bold">{t('af.newRegime')}</h4>
                                <p className="text-2xl font-black font-mono">{t('af.perYear', { amount: formatINR(a.estimatedAnnualPremium) })}</p>
                                <p className="text-xs text-muted-foreground">{t('af.newRegimeSub')}</p>
                            </div>
                            <div className="p-5 rounded-xl border border-border space-y-1">
                                <h4 className="text-sm font-bold">{t('af.oldRegime')}</h4>
                                <p className="text-2xl font-black font-mono">
                                    {a.tax.lifeSavingUpTo > 0 && `${formatINR(Math.max(0, a.estimatedAnnualPremium - a.tax.healthSaving - a.tax.lifeSavingUpTo))}–`}
                                    {t('af.perYear', { amount: formatINR(a.estimatedAnnualPremium - a.tax.healthSaving) })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {a.tax.marginalRatePct === 0
                                        ? t('af.rebate')
                                        : t('af.marginal', { pct: a.tax.marginalRatePct })}
                                </p>
                                {a.tax.marginalRatePct > 0 && (
                                    <ul className="text-xs text-muted-foreground space-y-1 pt-1">
                                        <li>
                                            <span className="font-bold text-foreground">{t('af.healthPremiums')}</span> {t('af.healthDeduction', { deduction: formatINR(a.tax.healthDeduction), saving: formatINR(a.tax.healthSaving) })}
                                            {a.tax.healthAboveLimit > 0 && ` ${t('af.aboveLimit', { amount: formatINR(a.tax.healthAboveLimit) })}`}
                                        </li>
                                        {a.tax.lifeDeduction > 0 && (
                                            <li>
                                                <span className="font-bold text-foreground">{t('af.termPremium')}</span> {t('af.termDeduction', { saving: formatINR(a.tax.lifeSavingUpTo) })}
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('af.taxNote')}
                        </p>
                    </Card>
                )}
            </div>
        </div>
    );
};
