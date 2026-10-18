import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bookmark, ChevronRight, FileText, Star, Check, Minus, Info, ShieldCheck, HeartPulse, Activity, Accessibility, TriangleAlert } from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi, type InsuranceType, type GeneralHealthInsurer, type InsurerRank, type InsurerRecords, type InsurerService, type PlanTypeOptions, type RankingAdjustment, type RankingMeasure, type SavedPlan } from '@/lib/api';
import { formatINR } from '@/lib/utils';

const TYPE_ICON: Record<InsuranceType, React.ComponentType<{ className?: string }>> = {
    term_life: ShieldCheck,
    health: HeartPulse,
    critical_illness: Activity,
    personal_accident: Accessibility,
};

export const ComparisonView: React.FC = () => {
    const { user, setCurrentScreen, setSelectedPolicyId } = useApp();
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
                setLoadError(res?.code === 'ONBOARDING_REQUIRED' ? 'ONBOARDING' : res?.error || 'Could not load plan options. Please try again.');
            }
        });
    }, [user.isLoggedIn, user]);

    useEffect(() => {
        if (activeTab !== 'saved' || plans !== null) return;
        ShieldIQApi.getPlans().then(res => setPlans(res && res.success && Array.isArray(res.data) ? res.data : []));
    }, [activeTab, plans]);

    const current = planTypes?.find(t => t.type === activeType);
    const openDetails = (id: string) => {
        setSelectedPolicyId(id);
        setCurrentScreen('deepdive');
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 font-sans bg-background text-foreground">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <header className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight">Plan Options & Comparison</h1>
                    <p className="text-muted-foreground font-medium max-w-2xl">
                        Four ways to buy each type of cover, quoted for your age, family, city and lifestyle, with the one that fits you best highlighted.
                    </p>
                </header>
                <Button onClick={() => window.print()} className="font-bold h-11 bg-blue-600 hover:bg-blue-700 print:hidden text-white">
                    <FileText className="w-4 h-4 mr-2" /> Print Summary
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="bg-muted p-1 rounded-xl h-14 border border-border max-w-full">
                    <TabsTrigger value="options" className="px-3 sm:px-8 rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Star className="w-4 h-4 mr-2" /> Plan Options
                    </TabsTrigger>
                    <TabsTrigger value="saved" className="px-3 sm:px-8 rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Bookmark className="w-4 h-4 mr-2" /> Saved Strategies
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="options" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    {loadError === 'ONBOARDING' ? (
                        <Card className="p-8 flex items-center justify-between gap-4">
                            <p className="text-sm">Complete your financial profile to get plan options quoted for you.</p>
                            <Button onClick={() => setCurrentScreen('onboarding')} className="bg-blue-600 hover:bg-blue-700">Complete Profile</Button>
                        </Card>
                    ) : loadError ? (
                        <p role="alert" className="text-sm text-red-600">{loadError}</p>
                    ) : !planTypes || !current ? (
                        <p className="text-sm text-muted-foreground">Quoting plans for you…</p>
                    ) : (
                        <>
                            {/* Insurance type selector */}
                            <div role="tablist" aria-label="Insurance type" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {planTypes.map(t => {
                                    const Icon = TYPE_ICON[t.type];
                                    const selected = t.type === activeType;
                                    const pick = t.options.find(o => o.recommended);
                                    return (
                                        <button
                                            key={t.type}
                                            role="tab"
                                            aria-selected={selected}
                                            onClick={() => setActiveType(t.type)}
                                            className={`text-left p-4 rounded-xl border transition-all ${selected ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30 shadow-sm' : 'border-border bg-card hover:border-blue-500/40'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Icon className={`w-4 h-4 ${selected ? 'text-blue-600' : 'text-muted-foreground'}`} />
                                                <span className="text-sm font-black">{t.label}</span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-1">
                                                {formatINR(t.cover)} cover · {pick ? `from ${formatINR(pick.annualPremium)}/yr` : 'no gap'}
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
                                            {o.recommended && <Badge className="bg-blue-600 text-white border-none text-[9px] font-black uppercase tracking-widest">Recommended for you</Badge>}
                                            <h3 className="font-black tracking-tight leading-tight">{o.name}</h3>
                                            <p className="text-[11px] text-muted-foreground">{o.insurer}</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-black font-mono">{formatINR(o.annualPremium)}<span className="text-xs text-muted-foreground font-sans">/yr</span></p>
                                            <p className="text-[11px] text-muted-foreground">{formatINR(o.monthlyPremium)}/mo · {formatINR(o.cover)} cover</p>
                                            {o.note && <p className="text-[11px] text-blue-600 mt-1">{o.note}</p>}
                                        </div>
                                        <p className="text-xs text-foreground/80">{o.structure}</p>
                                        <ul className="space-y-1.5 text-xs">
                                            {o.features.map(f => (
                                                <li key={f} className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />{f}</li>
                                            ))}
                                            {o.tradeOffs.map(t => (
                                                <li key={t} className="flex gap-2 text-muted-foreground"><Minus className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />{t}</li>
                                            ))}
                                        </ul>
                                        <div className="mt-auto space-y-2">
                                            <p className="text-[11px] text-muted-foreground"><span className="font-bold text-foreground">Best for:</span> {o.bestFor}</p>
                                            <Button variant="outline" size="sm" onClick={() => openDetails(o.id)} className="w-full font-bold">
                                                Fine Print <ChevronRight className="w-4 h-4 ml-1" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {/* Side-by-side table */}
                            <Card className="relative overflow-x-auto border-border">
                                <table className="w-full text-left text-sm">
                                    <caption className="sr-only">{current.label} options compared</caption>
                                    <thead className="bg-muted border-b border-border">
                                        <tr>
                                            {['Plan', 'Cover', 'Premium / yr', 'Waiting Period', 'Clarity'].map(h => (
                                                <th key={h} scope="col" className="px-4 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {current.options.map(o => (
                                            <tr key={o.id} className={o.recommended ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''}>
                                                <th scope="row" className="px-4 py-4 font-bold">{o.name}{o.recommended && <span className="sr-only"> (recommended)</span>}</th>
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

                            <p className="text-[11px] text-muted-foreground">{disclaimer}</p>
                        </>
                    )}
                </TabsContent>

                <TabsContent value="saved" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    {plans === null && <p className="text-sm text-muted-foreground">Loading your saved plans…</p>}
                    {plans?.length === 0 && <p className="text-sm text-muted-foreground">No saved plans yet. Save one from the calculator or coverage analysis.</p>}
                    {plans?.map(plan => (
                        <Card key={plan.id} className="p-6 border-border">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-6">
                                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-foreground tracking-tight">{plan.name}</h4>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                            {plan.category} • {formatINR(plan.coverageAmount)} • {plan.lastModified}
                                        </p>
                                    </div>
                                </div>
                                <Badge className={`px-3 py-0.5 rounded-full font-black text-[9px] uppercase tracking-widest border-none ${plan.status === 'Adequate' ? 'bg-emerald-50 text-emerald-700 dark:text-emerald-400' : plan.status === 'Incomplete' || plan.status === 'Archived' ? 'bg-slate-100 text-slate-600 dark:text-slate-400' : 'bg-amber-50 text-amber-700 dark:text-amber-400'}`}>
                                    {plan.status}
                                </Badge>
                            </div>
                        </Card>
                    ))}
                    <Button onClick={() => setCurrentScreen('savedplans')} variant="outline" className="font-bold">
                        Manage Saved Plans <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </TabsContent>
            </Tabs>
        </div>
    );
};

interface RecordColumn<R> {
    header: string;
    value: (r: R) => string;
    /** True when this value is clearly weaker than the other insurers listed. */
    weak?: (r: R, all: R[]) => boolean;
    muted?: boolean;
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
// Shared service columns: complaints well above the group, solvency close to IRDAI's 1.5 minimum.
const serviceColumns = <R extends InsurerService>(): RecordColumn<R>[] => [
    { header: 'Complaints / 10k Policies', value: r => r.complaintsPer10kPolicies.toFixed(1), weak: (r, all) => r.complaintsPer10kPolicies > 2 * median(all.map(x => x.complaintsPer10kPolicies)) },
    { header: 'Solvency', value: r => r.solvencyRatio.toFixed(2), weak: r => r.solvencyRatio < 1.8 },
    { header: 'Offices', value: r => r.offices.toLocaleString('en-IN'), muted: true },
];

const RecordsTable = <R extends { insurer: string }>({ caption, rows, columns }: { caption: string; rows: R[]; columns: RecordColumn<R>[] }) => (
    <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border">
            <tr>
                <th scope="col" className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Insurer</th>
                {columns.map(c => <th key={c.header} scope="col" className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground tracking-widest">{c.header}</th>)}
            </tr>
        </thead>
        <tbody className="divide-y divide-border">
            {rows.map(r => (
                <tr key={r.insurer}>
                    <th scope="row" className="px-4 py-2 font-bold whitespace-nowrap">{r.insurer}</th>
                    {columns.map(c => {
                        const weak = c.weak?.(r, rows);
                        return (
                            <td key={c.header} className={`px-4 py-2 font-mono ${weak ? 'text-amber-700 dark:text-amber-400 font-bold' : c.muted ? 'text-muted-foreground' : ''}`}>
                                {c.value(r)}{weak && <span className="sr-only"> (weaker than peers)</span>}
                            </td>
                        );
                    })}
                </tr>
            ))}
        </tbody>
    </table>
);

const LIFE_COLUMNS: RecordColumn<InsurerRecords['life'][number]>[] = [
    { header: 'Score', value: r => String(r.score) },
    { header: 'Claims Paid (by number)', value: r => `${r.paidByNumberPct.toFixed(2)}%` },
    { header: 'Claims Paid (by amount)', value: r => `${r.paidByAmountPct.toFixed(2)}%`, weak: r => r.paidByAmountPct < 90 },
    { header: 'Paid Within 30 Days', value: r => `${r.settledWithin30DaysPct.toFixed(1)}%`, weak: r => r.settledWithin30DaysPct < 90 },
    ...serviceColumns<InsurerRecords['life'][number]>(),
    { header: 'Claims Handled', value: r => r.claimsHandled.toLocaleString('en-IN'), muted: true },
];

const HEALTH_COLUMNS: RecordColumn<InsurerRecords['health'][number]>[] = [
    { header: 'Score', value: r => String(r.score) },
    { header: 'Claims Paid', value: r => `${r.paidPct.toFixed(2)}%` },
    { header: 'Claims Rejected', value: r => `${r.repudiatedPct.toFixed(2)}%`, weak: r => r.repudiatedPct > 10 },
    { header: 'Payout Ratio', value: r => `${r.incurredClaimsRatioPct.toFixed(1)}%` },
    ...serviceColumns<InsurerRecords['health'][number]>(),
    { header: 'Claims Handled', value: r => r.claimsHandled.toLocaleString('en-IN'), muted: true },
];

// Claims ratio outside 55-100% is worth a second look: very low pays out little; over 100% loses money (premiums may rise).
const GENERAL_COLUMNS: RecordColumn<GeneralHealthInsurer>[] = [
    { header: 'Ownership', value: r => (r.governmentOwned ? 'Government' : 'Private'), muted: true },
    { header: 'Retail Health Premium', value: r => `₹${r.retailHealthPremiumCr.toLocaleString('en-IN')} Cr`, muted: true },
    { header: 'Claims Ratio', value: r => `${r.retailClaimsRatioPct.toFixed(1)}%`, weak: r => r.retailClaimsRatioPct > 100 || r.retailClaimsRatioPct < 55 },
    { header: 'Claims Ratio (3 yrs)', value: r => `${r.retailClaimsRatioPct3y.toFixed(1)}%`, weak: r => r.retailClaimsRatioPct3y > 100 || r.retailClaimsRatioPct3y < 55 },
    { header: 'Solvency', value: r => r.solvencyRatio.toFixed(2), weak: r => r.solvencyRatio < 1.5 },
    { header: 'Offices', value: r => r.offices.toLocaleString('en-IN'), muted: true },
];

/** General insurers' retail health figures: shown for reference, never ranked against standalone health insurers. */
const GeneralHealthInsurers: React.FC<{ rows: GeneralHealthInsurer[]; source: InsurerRecords['source'] }> = ({ rows, source }) => (
    <Card className="relative overflow-x-auto border-border p-6 space-y-4">
        <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight uppercase">General Insurers That Also Sell Health Cover</h3>
            <p className="text-xs text-muted-foreground">
                HDFC ERGO, ICICI Lombard, the government-owned insurers and others sell health policies too. IRDAI doesn't publish their health
                claim settlement or rejection rates, so they aren't ranked above. Shown here: their retail (individual and family) health business,
                largest first.
            </p>
            <p className="text-xs text-muted-foreground">
                <span className="font-bold">Claims ratio</span> is health claims as a share of premiums earned ({source.threeYearPeriod} for the 3-year figure).{' '}
                <span className="font-bold text-amber-700 dark:text-amber-400">Amber</span>: a ratio over 100% (paying out more than it earns, so premiums
                may rise) or under 55% (paying out little of what it collects), or solvency below IRDAI's 1.5 minimum.
            </p>
        </div>
        <RecordsTable caption={`General insurers' retail health business, ${source.period}`} rows={rows} columns={GENERAL_COLUMNS} />
    </Card>
);

const MEASURE_TEXT: Record<RankingMeasure, (v: number) => string> = {
    claimValuePaid: v => `Paid ${v.toFixed(1)}% of claim value`,
    claimsPaid: v => `Paid ${v.toFixed(1)}% of claims`,
    paidWithin30Days: v => `${v.toFixed(0)}% of death claims paid within 30 days`,
    claimsRejected: v => `Rejected ${v.toFixed(1)}% of claims`,
    complaints: v => `${v.toFixed(1)} complaints per 10,000 policies`,
    solvency: v => `Solvency ${v.toFixed(2)} (IRDAI minimum 1.5)`,
    offices: v => `${v.toLocaleString('en-IN')} offices`,
};

const ADJUSTMENT_TEXT: Record<RankingAdjustment, string> = {
    largeCover: 'Your cover need is over ₹1 Cr, so the share of claim value paid counts more: large claims are the ones most often refused.',
    parents: 'You cover parents, so rejected claims count more: older members claim more and face more pre-existing-disease rejections.',
    conditions: 'You have a pre-existing condition, so rejected claims count more.',
    smallerCity: 'You live outside a metro, so branch reach counts too.',
};

// Which household adjustments change each ranking (largeCover only weighs life claims, parents only health).
const APPLIES: Record<'life' | 'health', RankingAdjustment[]> = { life: ['largeCover', 'smallerCity'], health: ['parents', 'conditions', 'smallerCity'] };

const SHORTLIST = {
    life: {
        method: 'claim value paid, claims paid, payout within 30 days, complaints and financial strength',
        // Core claim figures shown for every pick, so a pick's strengths list never hides how it pays claims.
        claimIds: ['claimValuePaid', 'claimsPaid'] as RankingMeasure[],
        claims: (r: InsurerRecords['life'][number]) => `Paid ${r.threeYear.paidByAmountPct.toFixed(1)}% of claim value, ${r.threeYear.paidByNumberPct.toFixed(1)}% of claims`,
    },
    health: {
        method: 'claims paid, claims rejected, complaints and financial strength',
        claimIds: ['claimsPaid', 'claimsRejected'] as RankingMeasure[],
        claims: (r: InsurerRecords['health'][number]) => `Paid ${r.threeYear.paidPct.toFixed(1)}% of claims, rejected ${r.threeYear.repudiatedPct.toFixed(1)}%`,
    },
};

/** The top three insurers of a ranking, with their claim record, what they do well and what to watch. */
const InsurerShortlist: React.FC<{ title: string; kind: 'life' | 'health'; records: InsurerRecords }> = ({ title, kind, records }) => {
    const { source } = records;
    const cfg = SHORTLIST[kind];
    const rows: (InsurerRank & { insurer: string; claims: string })[] = kind === 'life'
        ? records.life.map(r => ({ ...r, claims: SHORTLIST.life.claims(r) }))
        : records.health.map(r => ({ ...r, claims: SHORTLIST.health.claims(r) }));
    return (
        <Card className="border-blue-500/30 p-6 space-y-4">
            <div className="space-y-1">
                <h3 className="text-lg font-black tracking-tight uppercase">{title}</h3>
                <p className="text-xs text-muted-foreground">
                    Ranked on {source.publisher}'s published records for {source.threeYearPeriod} ({cfg.method}; solvency and offices
                    from {source.period}), scored 0-100 on fixed scales.
                </p>
                {records.adjustments.filter(a => APPLIES[kind].includes(a)).map(a => <p key={a} className="text-xs font-bold text-blue-600">{ADJUSTMENT_TEXT[a]}</p>)}
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
                                <li key={x.id} className="flex gap-1.5"><Check className="w-3.5 h-3.5 shrink-0 text-green-600" aria-hidden="true" />{MEASURE_TEXT[x.id](x.value)}</li>
                            ))}
                            {r.watchOut && (
                                <li className="flex gap-1.5 text-amber-700 dark:text-amber-400">
                                    <TriangleAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                    <span><span className="sr-only">Watch out: </span>{MEASURE_TEXT[r.watchOut.id](r.watchOut.value)}</span>
                                </li>
                            )}
                        </ul>
                    </li>
                ))}
            </ol>
            <p className="text-[11px] text-muted-foreground">
                A ranking of published records, not advice to buy from a particular insurer. Scores a few points apart are close.
                Compare policy terms and get quotes before buying.
            </p>
        </Card>
    );
};

/** The household's insurer shortlist and the full official records for this type of cover, best first. */
const InsurerClaimRecords: React.FC<{ type: InsuranceType; records: InsurerRecords }> = ({ type, records }) => {
    const { source } = records;
    if (type === 'personal_accident') {
        return (
            <p className="text-xs text-muted-foreground">
                IRDAI does not publish insurer-wise claim figures for personal accident cover, so ShieldIQ doesn't rank insurers for it.
                When choosing, look at the insurer's claim and service record under Term Life or Health.
            </p>
        );
    }
    if (type === 'critical_illness') {
        // No CI-specific figures: a rider is paid by the term insurer, a standalone policy usually by a health insurer.
        return (
            <div className="space-y-4">
                <p className="text-xs text-muted-foreground">IRDAI does not publish insurer-wise critical illness figures. The insurer that pays depends on how you buy it:</p>
                <InsurerShortlist title="As a rider on a term plan: top 3 life insurers" kind="life" records={records} />
                <InsurerShortlist title="As a standalone policy: top 3 health insurers" kind="health" records={records} />
            </div>
        );
    }
    const life = type === 'term_life';
    return (
        <>
        <InsurerShortlist title={life ? 'Top 3 life insurers for you' : 'Top 3 health insurers for you'} kind={life ? 'life' : 'health'} records={records} />
        <Card className="relative overflow-x-auto border-border p-6 space-y-4">
            <div className="space-y-1">
                <h3 className="text-lg font-black tracking-tight uppercase">{life ? "Life Insurers' Claim & Service Records" : "Health Insurers' Claim & Service Records"}</h3>
                <p className="text-xs text-muted-foreground">
                    {life
                        ? 'Claims paid, how fast death claims are settled, complaints, financial strength and branch reach. "By amount" is lower when large claims are refused, so check both.'
                        : 'Standalone health insurers: claims paid and rejected, complaints, financial strength and branch reach. Payout ratio is claims paid as a share of premiums earned. General insurers also sell health cover, but IRDAI reports their claims combined with motor and other lines.'}
                </p>
                <p className="text-xs text-muted-foreground">
                    All insurers, highest score first. The score uses {source.threeYearPeriod} figures; the other columns show {source.period}.
                </p>
                <p className="text-xs text-muted-foreground">
                    <span className="font-bold text-amber-700 dark:text-amber-400">Amber</span> marks a weak spot:{' '}
                    {life ? 'under 90% paid by amount or within 30 days, ' : 'over 10% of claims rejected, '}
                    complaints more than twice the typical insurer here, or solvency below 1.8 (IRDAI's minimum is 1.5).
                </p>
            </div>
            {life
                ? <RecordsTable caption={`Life insurers' claim and service records, ${source.period}`} rows={records.life} columns={LIFE_COLUMNS} />
                : <RecordsTable caption={`Health insurers' claim and service records, ${source.period}`} rows={records.health} columns={HEALTH_COLUMNS} />}
            <p className="text-[11px] text-muted-foreground">
                Source: {source.publisher}, {source.documents}, {source.period}.{' '}
                <a href={source.url} target="_blank" rel="noreferrer" className="underline">irdai.gov.in</a>
            </p>
        </Card>
        {!life && records.generalHealth && records.generalHealth.length > 0 && <GeneralHealthInsurers rows={records.generalHealth} source={source} />}
        </>
    );
};
