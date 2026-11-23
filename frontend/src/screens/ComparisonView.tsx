import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bookmark, ChevronRight, FileText, Star, Check, Minus, Info, ShieldCheck, HeartPulse, Activity, Accessibility, TriangleAlert } from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi, type InsuranceType, type GeneralHealthInsurer, type InsurerRank, type InsurerRecords, type InsurerService, type PlanTypeOptions, type RankingAdjustment, type RankingMeasure, type SavedPlan } from '@/lib/api';
import { formatINR } from '@/lib/utils';
import { useI18n, type Translate } from '@/lib/i18n';
import type { MessageKey } from '@/locales/en';

const TYPE_ICON: Record<InsuranceType, React.ComponentType<{ className?: string }>> = {
    term_life: ShieldCheck,
    health: HeartPulse,
    critical_illness: Activity,
    personal_accident: Accessibility,
};

export const ComparisonView: React.FC = () => {
    const { user, setCurrentScreen, setSelectedPolicyId } = useApp();
    const { t, tServer } = useI18n();
    const [activeTab, setActiveTab] = useState("options");
    const [planTypes, setPlanTypes] = useState<PlanTypeOptions[] | null>(null);
    const [disclaimer, setDisclaimer] = useState('');
    const [records, setRecords] = useState<InsurerRecords | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [activeType, setActiveType] = useState<InsuranceType>('term_life');
    const [plans, setPlans] = useState<SavedPlan[] | null>(null);

    useEffect(() => {
        if (!user.isLoggedIn) return;
        ShieldIQApi.getPlanOptions().then(res => {
            if (res && res.success) {
                setPlanTypes(res.data);
                setDisclaimer(res.disclaimer);
                setRecords(res.insurerRecords ?? null);
            } else {
                setLoadError(res?.code === 'ONBOARDING_REQUIRED' ? 'ONBOARDING' : tServer(res?.error) ?? t('cmp.loadError'));
            }
        });
    }, [user.isLoggedIn, user, t, tServer]);

    useEffect(() => {
        if (activeTab !== 'saved' || plans !== null) return;
        ShieldIQApi.getPlans().then(res => setPlans(res && res.success && Array.isArray(res.data) ? res.data : []));
    }, [activeTab, plans]);

    const current = planTypes?.find(p => p.type === activeType);
    const openDetails = (id: string) => {
        setSelectedPolicyId(id);
        setCurrentScreen('deepdive');
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 font-sans bg-background text-foreground">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <header className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight">{t('cmp.title')}</h1>
                    <p className="text-muted-foreground font-medium max-w-2xl">
                        {t('cmp.subtitle')}
                    </p>
                </header>
                <Button onClick={() => window.print()} className="font-bold h-11 bg-blue-600 hover:bg-blue-700 print:hidden text-white">
                    <FileText className="w-4 h-4 mr-2" /> {t('cmp.print')}
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="bg-muted p-1 rounded-xl h-14 border border-border max-w-full">
                    <TabsTrigger value="options" className="px-3 sm:px-8 rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Star className="w-4 h-4 mr-2" /> {t('cmp.tabOptions')}
                    </TabsTrigger>
                    <TabsTrigger value="saved" className="px-3 sm:px-8 rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Bookmark className="w-4 h-4 mr-2" /> {t('cmp.tabSaved')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="options" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    {loadError === 'ONBOARDING' ? (
                        <Card className="p-8 flex items-center justify-between gap-4">
                            <p className="text-sm">{t('cmp.completeFirst')}</p>
                            <Button onClick={() => setCurrentScreen('onboarding')} className="bg-blue-600 hover:bg-blue-700">{t('cmp.completeButton')}</Button>
                        </Card>
                    ) : loadError ? (
                        <p role="alert" className="text-sm text-red-600">{loadError}</p>
                    ) : !planTypes || !current ? (
                        <p className="text-sm text-muted-foreground">{t('cmp.quoting')}</p>
                    ) : (
                        <>
                            {/* Insurance type selector */}
                            <div role="tablist" aria-label={t('cmp.typeAria')} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {planTypes.map(pt => {
                                    const Icon = TYPE_ICON[pt.type];
                                    const selected = pt.type === activeType;
                                    const pick = pt.options.find(o => o.recommended);
                                    return (
                                        <button
                                            key={pt.type}
                                            role="tab"
                                            aria-selected={selected}
                                            onClick={() => setActiveType(pt.type)}
                                            className={`text-left p-4 rounded-xl border transition-all ${selected ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30 shadow-sm' : 'border-border bg-card hover:border-blue-500/40'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Icon className={`w-4 h-4 ${selected ? 'text-blue-600' : 'text-muted-foreground'}`} />
                                                <span className="text-sm font-black">{t(`planType.${pt.type}`)}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {pick ? t('cmp.typeCover', { cover: formatINR(pt.cover), premium: formatINR(pick.annualPremium) }) : t('cmp.typeNoGap', { cover: formatINR(pt.cover) })}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Need + recommendation */}
                            <Card className="p-6 space-y-2 border-blue-500/30">
                                <p className="text-xs font-bold text-muted-foreground">{current.coverRationale}</p>
                                <p className="flex gap-2 text-sm">
                                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                                    <span>{current.recommendationReason}</span>
                                </p>
                            </Card>

                            {/* Option cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                {current.options.map(o => (
                                    <Card
                                        key={o.id}
                                        className={`p-5 flex flex-col gap-4 ${o.recommended ? 'border-2 border-blue-600 shadow-lg shadow-blue-600/10' : 'border-border'}`}
                                    >
                                        <div className="space-y-1">
                                            {o.recommended && <Badge className="bg-blue-600 text-white border-none text-xs font-bold uppercase tracking-widest">{t('cmp.recommended')}</Badge>}
                                            <h3 className="font-black tracking-tight leading-tight">{o.name}</h3>
                                            <p className="text-xs text-muted-foreground">{o.insurer}</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-black font-mono">{formatINR(o.annualPremium)}<span className="text-xs text-muted-foreground font-sans">{t('cmp.perYear')}</span></p>
                                            <p className="text-xs text-muted-foreground">{t('cmp.monthly', { monthly: formatINR(o.monthlyPremium), cover: formatINR(o.cover) })}</p>
                                            {o.note && <p className="text-xs text-blue-600 mt-1">{o.note}</p>}
                                        </div>
                                        <p className="text-xs text-foreground/80">{o.structure}</p>
                                        <ul className="space-y-1.5 text-xs">
                                            {o.features.map(f => (
                                                <li key={f} className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />{f}</li>
                                            ))}
                                            {o.tradeOffs.map(x => (
                                                <li key={x} className="flex gap-2 text-muted-foreground"><Minus className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />{x}</li>
                                            ))}
                                        </ul>
                                        <div className="mt-auto space-y-2">
                                            <p className="text-xs text-muted-foreground"><span className="font-bold text-foreground">{t('cmp.bestFor')}</span> {o.bestFor}</p>
                                            <Button variant="outline" size="sm" onClick={() => openDetails(o.id)} className="w-full font-bold">
                                                {t('cmp.finePrint')} <ChevronRight className="w-4 h-4 ml-1" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {/* Side-by-side table */}
                            <Card className="relative overflow-x-auto border-border">
                                <table className="w-full text-left text-sm">
                                    <caption className="sr-only">{t('cmp.tableCaption', { type: t(`planType.${current.type}`) })}</caption>
                                    <thead className="bg-muted border-b border-border">
                                        <tr>
                                            {(['cmp.col.plan', 'cmp.col.cover', 'cmp.col.premium', 'cmp.col.waiting', 'cmp.col.clarity'] as const).map(h => (
                                                <th key={h} scope="col" className="px-4 py-4 text-xs font-bold uppercase text-muted-foreground tracking-widest">{t(h)}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {current.options.map(o => (
                                            <tr key={o.id} className={o.recommended ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''}>
                                                <th scope="row" className="px-4 py-4 font-bold">{o.name}{o.recommended && <span className="sr-only">{t('cmp.recommendedSr')}</span>}</th>
                                                <td className="px-4 py-4 font-mono">{formatINR(o.cover)}</td>
                                                <td className="px-4 py-4 font-mono font-bold">{formatINR(o.annualPremium)}</td>
                                                <td className="px-4 py-4 text-xs text-muted-foreground max-w-[220px]">{o.waitingPeriod}</td>
                                                <td className="px-4 py-4">{o.clarityScore}/100</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>

                            {records && <InsurerClaimRecords type={activeType} records={records} />}

                            <p className="text-xs text-muted-foreground">{disclaimer}</p>
                        </>
                    )}
                </TabsContent>

                <TabsContent value="saved" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    {plans === null && <p className="text-sm text-muted-foreground">{t('cmp.savedLoading')}</p>}
                    {plans?.length === 0 && <p className="text-sm text-muted-foreground">{t('cmp.savedEmpty')}</p>}
                    {plans?.map(plan => (
                        <Card key={plan.id} className="p-6 border-border">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-6">
                                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-foreground tracking-tight">{plan.name}</h4>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                            {plan.category} • {formatINR(plan.coverageAmount)} • {plan.lastModified}
                                        </p>
                                    </div>
                                </div>
                                <Badge className={`px-3 py-0.5 rounded-full font-bold text-xs uppercase tracking-widest border-none ${plan.status === 'Adequate' ? 'bg-emerald-50 text-emerald-700 dark:text-emerald-400' : plan.status === 'Incomplete' || plan.status === 'Archived' ? 'bg-slate-100 text-slate-600 dark:text-slate-400' : 'bg-amber-50 text-amber-700 dark:text-amber-400'}`}>
                                    {t(`sp.status.${plan.status}`)}
                                </Badge>
                            </div>
                        </Card>
                    ))}
                    <Button onClick={() => setCurrentScreen('savedplans')} variant="outline" className="font-bold">
                        {t('cmp.manage')} <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </TabsContent>
            </Tabs>
        </div>
    );
};

interface RecordColumn<R> {
    header: MessageKey;
    value: (r: R, t: Translate) => string;
    /** True when this value is clearly weaker than the other insurers listed. */
    weak?: (r: R, all: R[]) => boolean;
    muted?: boolean;
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
// Shared service columns: complaints well above the group, solvency close to IRDAI's 1.5 minimum.
const serviceColumns = <R extends InsurerService>(): RecordColumn<R>[] => [
    { header: 'cmp.h.complaints', value: r => r.complaintsPer10kPolicies.toFixed(1), weak: (r, all) => r.complaintsPer10kPolicies > 2 * median(all.map(x => x.complaintsPer10kPolicies)) },
    { header: 'cmp.h.solvency', value: r => r.solvencyRatio.toFixed(2), weak: r => r.solvencyRatio < 1.8 },
    { header: 'cmp.h.offices', value: r => r.offices.toLocaleString('en-IN'), muted: true },
];

const RECORDS_SHOWN = 5;

/** Best-scored rows first; long lists start with the top few so the page stays readable. */
const RecordsTable = <R extends { insurer: string }>({ caption, rows, columns }: { caption: string; rows: R[]; columns: RecordColumn<R>[] }) => {
    const { t } = useI18n();
    const [showAll, setShowAll] = useState(false);
    const shown = showAll ? rows : rows.slice(0, RECORDS_SHOWN);
    return (
    <>
    <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border">
            <tr>
                <th scope="col" className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground tracking-widest">{t('cmp.insurer')}</th>
                {columns.map(c => <th key={c.header} scope="col" className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground tracking-widest">{t(c.header)}</th>)}
            </tr>
        </thead>
        <tbody className="divide-y divide-border">
            {shown.map(r => (
                <tr key={r.insurer}>
                    <th scope="row" className="px-4 py-2 font-bold whitespace-nowrap">{r.insurer}</th>
                    {columns.map(c => {
                        const weak = c.weak?.(r, rows);
                        return (
                            <td key={c.header} className={`px-4 py-2 font-mono ${weak ? 'text-amber-700 dark:text-amber-400 font-bold' : c.muted ? 'text-muted-foreground' : ''}`}>
                                {c.value(r, t)}{weak && <span className="sr-only">{t('cmp.weakerSr')}</span>}
                            </td>
                        );
                    })}
                </tr>
            ))}
        </tbody>
    </table>
    {rows.length > RECORDS_SHOWN && (
        <button type="button" onClick={() => setShowAll(v => !v)} aria-expanded={showAll} className="mt-3 text-sm font-bold text-blue-600 hover:underline">
            {showAll ? t('cmp.showTop', { n: RECORDS_SHOWN }) : t('cmp.showAll', { n: rows.length })}
        </button>
    )}
    </>
    );
};

const LIFE_COLUMNS: RecordColumn<InsurerRecords['life'][number]>[] = [
    { header: 'cmp.h.score', value: r => String(r.score) },
    { header: 'cmp.h.paidNumber', value: r => `${r.paidByNumberPct.toFixed(2)}%` },
    { header: 'cmp.h.paidAmount', value: r => `${r.paidByAmountPct.toFixed(2)}%`, weak: r => r.paidByAmountPct < 90 },
    { header: 'cmp.h.within30', value: r => `${r.settledWithin30DaysPct.toFixed(1)}%`, weak: r => r.settledWithin30DaysPct < 90 },
    ...serviceColumns<InsurerRecords['life'][number]>(),
    { header: 'cmp.h.handled', value: r => r.claimsHandled.toLocaleString('en-IN'), muted: true },
];

const HEALTH_COLUMNS: RecordColumn<InsurerRecords['health'][number]>[] = [
    { header: 'cmp.h.score', value: r => String(r.score) },
    { header: 'cmp.h.paid', value: r => `${r.paidPct.toFixed(2)}%` },
    { header: 'cmp.h.rejected', value: r => `${r.repudiatedPct.toFixed(2)}%`, weak: r => r.repudiatedPct > 10 },
    { header: 'cmp.h.payoutRatio', value: r => `${r.incurredClaimsRatioPct.toFixed(1)}%` },
    ...serviceColumns<InsurerRecords['health'][number]>(),
    { header: 'cmp.h.handled', value: r => r.claimsHandled.toLocaleString('en-IN'), muted: true },
];

// Claims ratio outside 55-100% is worth a second look: very low pays out little; over 100% loses money (premiums may rise).
const GENERAL_COLUMNS: RecordColumn<GeneralHealthInsurer>[] = [
    { header: 'cmp.h.ownership', value: (r, t) => t(r.governmentOwned ? 'cmp.government' : 'cmp.private'), muted: true },
    { header: 'cmp.h.retailPremium', value: r => `₹${r.retailHealthPremiumCr.toLocaleString('en-IN')} Cr`, muted: true },
    { header: 'cmp.h.claimsRatio', value: r => `${r.retailClaimsRatioPct.toFixed(1)}%`, weak: r => r.retailClaimsRatioPct > 100 || r.retailClaimsRatioPct < 55 },
    { header: 'cmp.h.claimsRatio3y', value: r => `${r.retailClaimsRatioPct3y.toFixed(1)}%`, weak: r => r.retailClaimsRatioPct3y > 100 || r.retailClaimsRatioPct3y < 55 },
    { header: 'cmp.h.solvency', value: r => r.solvencyRatio.toFixed(2), weak: r => r.solvencyRatio < 1.5 },
    { header: 'cmp.h.offices', value: r => r.offices.toLocaleString('en-IN'), muted: true },
];

/** General insurers' retail health figures: shown for reference, never ranked against standalone health insurers. */
const GeneralHealthInsurers: React.FC<{ rows: GeneralHealthInsurer[]; source: InsurerRecords['source'] }> = ({ rows, source }) => {
    const { t } = useI18n();
    return (
    <Card className="relative overflow-x-auto border-border p-6 space-y-4">
        <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight">{t('cmp.generalTitle')}</h3>
            <p className="text-xs text-muted-foreground">
                {t('cmp.generalBody')}
            </p>
            <p className="text-xs text-muted-foreground">
                <span className="font-bold">{t('cmp.claimsRatioLabel')}</span> {t('cmp.claimsRatioBody', { period: source.threeYearPeriod })}{' '}
                <span className="font-bold text-amber-700 dark:text-amber-400">{t('cmp.amber')}</span>{t('cmp.generalAmber')}
            </p>
        </div>
        <RecordsTable caption={t('cmp.generalCaption', { period: source.period })} rows={rows} columns={GENERAL_COLUMNS} />
    </Card>
    );
};

const MEASURE_FORMAT: Record<RankingMeasure, (v: number) => string> = {
    claimValuePaid: v => v.toFixed(1),
    claimsPaid: v => v.toFixed(1),
    paidWithin30Days: v => v.toFixed(0),
    claimsRejected: v => v.toFixed(1),
    complaints: v => v.toFixed(1),
    solvency: v => v.toFixed(2),
    offices: v => v.toLocaleString('en-IN'),
};
const measureText = (t: Translate, id: RankingMeasure, v: number) => t(`cmp.m.${id}`, { v: MEASURE_FORMAT[id](v) });

// Which household adjustments change each ranking (largeCover only weighs life claims, parents only health).
const APPLIES: Record<'life' | 'health', RankingAdjustment[]> = { life: ['largeCover', 'smallerCity'], health: ['parents', 'conditions', 'smallerCity'] };

const SHORTLIST = {
    life: {
        method: 'cmp.method.life' as const,
        // Core claim figures shown for every pick, so a pick's strengths list never hides how it pays claims.
        claimIds: ['claimValuePaid', 'claimsPaid'] as RankingMeasure[],
        claims: (t: Translate, r: InsurerRecords['life'][number]) => t('cmp.claims.life', { amount: r.threeYear.paidByAmountPct.toFixed(1), number: r.threeYear.paidByNumberPct.toFixed(1) }),
    },
    health: {
        method: 'cmp.method.health' as const,
        claimIds: ['claimsPaid', 'claimsRejected'] as RankingMeasure[],
        claims: (t: Translate, r: InsurerRecords['health'][number]) => t('cmp.claims.health', { paid: r.threeYear.paidPct.toFixed(1), rejected: r.threeYear.repudiatedPct.toFixed(1) }),
    },
};

/** The top three insurers of a ranking, with their claim record, what they do well and what to watch. */
const InsurerShortlist: React.FC<{ title: string; kind: 'life' | 'health'; records: InsurerRecords }> = ({ title, kind, records }) => {
    const { t } = useI18n();
    const { source } = records;
    const cfg = SHORTLIST[kind];
    const rows: (InsurerRank & { insurer: string; claims: string })[] = kind === 'life'
        ? records.life.map(r => ({ ...r, claims: SHORTLIST.life.claims(t, r) }))
        : records.health.map(r => ({ ...r, claims: SHORTLIST.health.claims(t, r) }));
    return (
        <Card className="border-blue-500/30 p-6 space-y-4">
            <div className="space-y-1">
                <h3 className="text-lg font-black tracking-tight">{title}</h3>
                <p className="text-xs text-muted-foreground">
                    {t('cmp.rankedOn', { publisher: source.publisher, years: source.threeYearPeriod, method: t(cfg.method), period: source.period })}
                </p>
                {records.adjustments.filter(a => APPLIES[kind].includes(a)).map(a => <p key={a} className="text-xs font-bold text-blue-600">{t(`cmp.adj.${a}`)}</p>)}
            </div>
            <ol className="grid gap-3 md:grid-cols-3">
                {rows.slice(0, 3).map(r => (
                    <li key={r.insurer} className="rounded-2xl border border-border p-4 space-y-2">
                        <div className="flex items-baseline justify-between gap-2">
                            <p className="font-black"><span className="text-muted-foreground">{r.rank}.</span> {r.insurer}</p>
                            <p className="font-mono text-sm font-bold text-blue-600">{r.score}<span className="text-muted-foreground">/100</span></p>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.claims}</p>
                        <ul className="space-y-1 text-xs">
                            {r.strengths.filter(x => !cfg.claimIds.includes(x.id)).map(x => (
                                <li key={x.id} className="flex gap-1.5"><Check className="w-3.5 h-3.5 shrink-0 text-green-600" aria-hidden="true" />{measureText(t, x.id, x.value)}</li>
                            ))}
                            {r.watchOut && (
                                <li className="flex gap-1.5 text-amber-700 dark:text-amber-400">
                                    <TriangleAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                    <span><span className="sr-only">{t('cmp.watchOut')}</span>{measureText(t, r.watchOut.id, r.watchOut.value)}</span>
                                </li>
                            )}
                        </ul>
                    </li>
                ))}
            </ol>
            <p className="text-xs text-muted-foreground">
                {t('cmp.notAdvice')}
            </p>
        </Card>
    );
};

/** The household's insurer shortlist and the full official records for this type of cover, best first. */
const InsurerClaimRecords: React.FC<{ type: InsuranceType; records: InsurerRecords }> = ({ type, records }) => {
    const { t } = useI18n();
    const { source } = records;
    if (type === 'personal_accident') {
        return (
            <p className="text-xs text-muted-foreground">
                {t('cmp.noPa')}
            </p>
        );
    }
    if (type === 'critical_illness') {
        // No CI-specific figures: a rider is paid by the term insurer, a standalone policy usually by a health insurer.
        return (
            <div className="space-y-4">
                <p className="text-xs text-muted-foreground">{t('cmp.noCi')}</p>
                <InsurerShortlist title={t('cmp.ciRider')} kind="life" records={records} />
                <InsurerShortlist title={t('cmp.ciStandalone')} kind="health" records={records} />
            </div>
        );
    }
    const life = type === 'term_life';
    return (
        <>
        <InsurerShortlist title={t(life ? 'cmp.topLife' : 'cmp.topHealth')} kind={life ? 'life' : 'health'} records={records} />
        <Card className="relative overflow-x-auto border-border p-6 space-y-4">
            <div className="space-y-1">
                <h3 className="text-lg font-black tracking-tight">{t(life ? 'cmp.lifeRecords' : 'cmp.healthRecords')}</h3>
                <p className="text-xs text-muted-foreground">
                    {t(life ? 'cmp.lifeRecordsBody' : 'cmp.healthRecordsBody')}
                </p>
                <p className="text-xs text-muted-foreground">
                    {t('cmp.allInsurers', { years: source.threeYearPeriod, period: source.period })}
                </p>
                <p className="text-xs text-muted-foreground">
                    <span className="font-bold text-amber-700 dark:text-amber-400">{t('cmp.amber')}</span>{t(life ? 'cmp.amberLife' : 'cmp.amberHealth')}
                </p>
            </div>
            {life
                ? <RecordsTable caption={t('cmp.lifeCaption', { period: source.period })} rows={records.life} columns={LIFE_COLUMNS} />
                : <RecordsTable caption={t('cmp.healthCaption', { period: source.period })} rows={records.health} columns={HEALTH_COLUMNS} />}
            <p className="text-xs text-muted-foreground">
                {t('cmp.source', { publisher: source.publisher, documents: source.documents, period: source.period })}{' '}
                <a href={source.url} target="_blank" rel="noreferrer" className="underline">irdai.gov.in</a>
            </p>
        </Card>
        {!life && records.generalHealth && records.generalHealth.length > 0 && <GeneralHealthInsurers rows={records.generalHealth} source={source} />}
        </>
    );
};
