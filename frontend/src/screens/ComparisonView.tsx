import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bookmark, ChevronRight, FileText, Star, Check, Minus, Info, ShieldCheck, HeartPulse, Activity, Accessibility } from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi, type InsuranceType, type InsurerRecords, type PlanTypeOptions, type SavedPlan } from '@/lib/api';
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
                <Button onClick={() => window.print()} className="font-bold h-11 bg-blue-600 hover:bg-blue-700 print:hidden">
                    <FileText className="w-4 h-4 mr-2" /> Print Summary
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="bg-muted p-1 rounded-xl h-14 border border-border">
                    <TabsTrigger value="options" className="px-8 rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Star className="w-4 h-4 mr-2" /> Plan Options
                    </TabsTrigger>
                    <TabsTrigger value="saved" className="px-8 rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
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
                                                <li key={f} className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />{f}</li>
                                            ))}
                                            {o.tradeOffs.map(t => (
                                                <li key={t} className="flex gap-2 text-muted-foreground"><Minus className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />{t}</li>
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
                            <Card className="overflow-x-auto border-border">
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
                                <Badge className={`px-3 py-0.5 rounded-full font-black text-[9px] uppercase tracking-widest border-none ${plan.status === 'Adequate' ? 'bg-emerald-50 text-emerald-600' : plan.status === 'Incomplete' || plan.status === 'Archived' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-600'}`}>
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

/** Official IRDAI claim records for insurers selling this type of cover, best first. */
const InsurerClaimRecords: React.FC<{ type: InsuranceType; records: InsurerRecords }> = ({ type, records }) => {
    const { source } = records;
    const cite = (
        <p className="text-[11px] text-muted-foreground">
            Source: {source.publisher}, {source.documents}, {source.period}.{' '}
            <a href={source.url} target="_blank" rel="noreferrer" className="underline">irdai.gov.in</a>
        </p>
    );
    const th = "px-4 py-3 text-[10px] font-black uppercase text-muted-foreground tracking-widest";
    if (type === 'term_life') {
        return (
            <Card className="overflow-x-auto border-border p-6 space-y-4">
                <div className="space-y-1">
                    <h3 className="text-lg font-black tracking-tight uppercase">Life Insurers' Claim Records</h3>
                    <p className="text-xs text-muted-foreground">Share of individual death claims each insurer paid. "By amount" is lower when large claims are refused, so check both.</p>
                </div>
                <table className="w-full text-left text-sm">
                    <caption className="sr-only">Life insurers' death claims paid, {source.period}</caption>
                    <thead className="border-b border-border">
                        <tr>{['Insurer', 'Claims Paid (by number)', 'Claims Paid (by amount)', 'Claims Handled'].map(h => <th key={h} scope="col" className={th}>{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {records.life.map(r => (
                            <tr key={r.insurer}>
                                <th scope="row" className="px-4 py-2 font-bold">{r.insurer}</th>
                                <td className="px-4 py-2 font-mono">{r.paidByNumberPct.toFixed(2)}%</td>
                                <td className={`px-4 py-2 font-mono ${r.paidByAmountPct < 90 ? 'text-amber-600 font-bold' : ''}`}>{r.paidByAmountPct.toFixed(2)}%</td>
                                <td className="px-4 py-2 font-mono text-muted-foreground">{r.claimsHandled.toLocaleString('en-IN')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {cite}
            </Card>
        );
    }
    if (type === 'health') {
        return (
            <Card className="overflow-x-auto border-border p-6 space-y-4">
                <div className="space-y-1">
                    <h3 className="text-lg font-black tracking-tight uppercase">Health Insurers' Claim Records</h3>
                    <p className="text-xs text-muted-foreground">
                        Standalone health insurers. Payout ratio is claims paid as a share of premiums earned. General insurers also sell health
                        cover, but IRDAI reports their claims combined with motor and other lines.
                    </p>
                </div>
                <table className="w-full text-left text-sm">
                    <caption className="sr-only">Health insurers' claims paid and rejected, {source.period}</caption>
                    <thead className="border-b border-border">
                        <tr>{['Insurer', 'Claims Paid', 'Claims Rejected', 'Payout Ratio', 'Claims Handled'].map(h => <th key={h} scope="col" className={th}>{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {records.health.map(r => (
                            <tr key={r.insurer}>
                                <th scope="row" className="px-4 py-2 font-bold">{r.insurer}</th>
                                <td className="px-4 py-2 font-mono">{r.paidPct.toFixed(2)}%</td>
                                <td className={`px-4 py-2 font-mono ${r.repudiatedPct > 10 ? 'text-amber-600 font-bold' : ''}`}>{r.repudiatedPct.toFixed(2)}%</td>
                                <td className="px-4 py-2 font-mono">{r.incurredClaimsRatioPct.toFixed(1)}%</td>
                                <td className="px-4 py-2 font-mono text-muted-foreground">{r.claimsHandled.toLocaleString('en-IN')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {cite}
            </Card>
        );
    }
    return (
        <p className="text-xs text-muted-foreground">
            IRDAI does not publish insurer-wise claim figures for {type === 'critical_illness' ? 'critical illness' : 'personal accident'} cover.
            When choosing, look at the insurer's overall claim record under Term Life or Health.
        </p>
    );
};
