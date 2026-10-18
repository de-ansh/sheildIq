import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
    HeartPulse,
    ShieldCheck,
    TrendingUp,
    Activity,
    Zap,
    Users,
    Stethoscope,
    Cigarette,
    Info
} from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi, CITY_TIERS, type CityTier, type HealthPlanResult } from '@/lib/api';
import { formatINR } from '@/lib/utils';
import { householdOf } from '@/lib/household';
import { ExplainResult } from '@/components/ExplainResult';

const RISK_OPTIONS = [
    { id: 'Chronic Condition', label: 'Chronic Condition in Family', icon: Stethoscope },
    { id: 'Tobacco/Smoking', label: 'Tobacco / Smoking', icon: Cigarette },
    { id: 'Planning Maternity', label: 'Planning Maternity', icon: Users },
];

export const HealthPlannerView: React.FC = () => {
    const { user } = useApp();

    // Seeded from the profile; editable for what-if planning.
    const [adults, setAdults] = useState(user.maritalStatus === 'Married' ? 2 : 1);
    // Children up to 25 share the family floater; parents get their own senior policy (see Coverage Analysis).
    const [kids, setKids] = useState(householdOf(user).children.filter(age => age === null || age < 25).length);
    const [cityTier, setCityTier] = useState<CityTier>(user.cityTier);
    const [employerCover, setEmployerCover] = useState(0);
    const [existingCover, setExistingCover] = useState(user.existingHealthCover);
    const [risks, setRisks] = useState<string[]>([
        ...user.lifestyleRisks.filter(r => RISK_OPTIONS.some(o => o.id === r)),
        ...(user.healthConditions.length > 0 ? ['Chronic Condition'] : []),
    ]);
    const [plan, setPlan] = useState<HealthPlanResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            const res = await ShieldIQApi.planHealthCover({
                adults: Math.max(1, adults),
                children: Math.max(0, kids),
                cityTier,
                employerCover,
                existingCover,
                risks,
                eldestAge: user.age,
            });
            if (cancelled) return;
            if (res && res.success && res.data) {
                setPlan(res.data);
                setError(null);
            } else {
                setError(res?.error || 'Cannot reach the planning engine. Check your connection and try again.');
            }
        }, 200);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [adults, kids, cityTier, employerCover, existingCover, risks, user.age]);

    const toggleRisk = (id: string) =>
        setRisks(prev => (prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]));

    const pct = (v: number) => (plan && plan.recommendedCover > 0 ? Math.min(100, Math.round((v / plan.recommendedCover) * 100)) : 0);

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-background text-foreground font-sans">
            {/* Sidebar - Control Center */}
            <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border bg-card flex flex-col shrink-0">
                <div className="p-6 space-y-8">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-1.5 rounded-lg">
                            <HeartPulse className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="font-black text-lg tracking-tight text-foreground">Health Planner</h2>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] block">Family to Cover</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="hp-adults" className="text-[10px] font-bold text-muted-foreground">Adults</Label>
                                <Input id="hp-adults" type="number" min={1} max={6} value={adults} onChange={e => setAdults(Number(e.target.value) || 1)} className="bg-muted/30 font-mono" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="hp-kids" className="text-[10px] font-bold text-muted-foreground">Kids</Label>
                                <Input id="hp-kids" type="number" min={0} max={10} value={kids} onChange={e => setKids(Number(e.target.value) || 0)} className="bg-muted/30 font-mono" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hp-tier" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] block">City Tier</Label>
                        <select
                            id="hp-tier"
                            value={cityTier}
                            onChange={e => setCityTier(e.target.value as CityTier)}
                            className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-bold"
                        >
                            {CITY_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hp-existing" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] block">Your Own Health Cover (₹)</Label>
                        <Input id="hp-existing" type="number" min={0} step={100000} value={existingCover} onChange={e => setExistingCover(Number(e.target.value) || 0)} className="bg-muted/30 font-mono" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hp-employer" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] block">Employer Group Cover (₹)</Label>
                        <Input id="hp-employer" type="number" min={0} step={100000} value={employerCover} onChange={e => setEmployerCover(Number(e.target.value) || 0)} className="bg-muted/30 font-mono" />
                        <p className="text-[10px] text-muted-foreground">Ends when you change jobs, so it isn't counted towards your own cover.</p>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] block">Health Risk Factors</Label>
                        {RISK_OPTIONS.map(risk => (
                            <div key={risk.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors group">
                                <Checkbox id={`hp-${risk.id}`} checked={risks.includes(risk.id)} onCheckedChange={() => toggleRisk(risk.id)} />
                                <risk.icon className="w-4 h-4 text-muted-foreground" />
                                <Label htmlFor={`hp-${risk.id}`} className="flex-1 text-xs font-bold text-muted-foreground group-hover:text-blue-600 transition-colors cursor-pointer">{risk.label}</Label>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-6 lg:p-12">
                <div className="max-w-5xl mx-auto space-y-8">
                    {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}

                    {/* Hero Recommendation */}
                    <Card className="bg-card shadow-2xl overflow-hidden border border-border">
                        <CardContent className="p-10 flex flex-col md:flex-row justify-between items-center gap-8">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-blue-600 flex-wrap">
                                    <ShieldCheck className="w-5 h-5" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Recommended Family Health Cover</span>
                                    {plan && <Badge className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-none text-[10px] font-black">{adults + kids} members · {cityTier}</Badge>}
                                </div>
                                <h1 className="text-5xl font-black tracking-tight text-foreground font-mono">{plan ? formatINR(plan.recommendedCover) : '—'}</h1>
                                <p className="text-muted-foreground font-medium">
                                    {plan ? `${formatINR(plan.basePolicy)} base policy + ${formatINR(plan.superTopUp)} super top-up` : 'Calculating…'}
                                </p>
                            </div>
                            <div className="flex gap-12 font-mono text-right md:border-l border-border md:pl-12">
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Est. Premium</p>
                                    <p className="text-2xl font-black text-foreground font-mono">
                                        {plan ? formatINR(plan.estimatedAnnualPremium) : '—'}<span className="text-xs text-muted-foreground">/yr</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Still Needed</p>
                                    <p className={`text-2xl font-black font-mono ${plan && plan.personalCoverNeeded > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-500'}`}>
                                        {plan ? formatINR(plan.personalCoverNeeded) : '—'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Metrics & Analytics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card className="border-border">
                            <CardHeader className="p-8 pb-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Adequacy Benchmarking</h3>
                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                {[
                                    { label: 'Your Own Cover', value: existingCover, bar: 'bg-muted-foreground' },
                                    { label: 'Employer Cover (not portable)', value: employerCover, bar: 'bg-amber-500' },
                                    { label: 'ShieldIQ Recommendation', value: plan?.recommendedCover ?? 0, bar: 'bg-blue-600' },
                                ].map(row => (
                                    <div key={row.label} className="space-y-2">
                                        <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                                            <span>{row.label}</span>
                                            <span className="text-foreground">{formatINR(row.value)}</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div className={`h-full ${row.bar} rounded-full transition-all`} style={{ width: `${pct(row.value)}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Risk Profile</h3>
                                <Activity className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="space-y-4">
                                {[
                                    { label: 'Coverage Adequacy Score', value: plan ? `${plan.adequacyScore} / 100` : '—', color: 'text-blue-600' },
                                    { label: 'Uncovered Exposure', value: plan ? formatINR(plan.personalCoverNeeded) : '—', color: 'text-foreground' },
                                    { label: 'Reliance on Employer Cover', value: plan ? `${plan.employerDependencyShare}%` : '—', color: plan && plan.employerDependencyShare >= 50 ? 'text-amber-700 dark:text-amber-400' : 'text-foreground' },
                                    { label: 'Base Policy Deductible for Top-Up', value: plan ? formatINR(plan.basePolicy) : '—', color: 'text-foreground' },
                                ].map(item => (
                                    <div key={item.label} className="flex justify-between items-center p-4 bg-muted/30 border border-border rounded-xl">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{item.label}</span>
                                        <span className={`font-mono font-black ${item.color}`}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <Card className="dark bg-slate-950 text-white p-8 border-none overflow-hidden relative">
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-blue-400" />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">How This Was Calculated</h4>
                            </div>
                            <div className="max-w-3xl text-sm text-slate-300 leading-relaxed space-y-3">
                                <p>
                                    Starting point is ₹10L for one person in a Tier 1 city (₹7.5L Tier 2, ₹5L Tier 3), plus 25% for each additional
                                    family member, with loadings for tobacco use, chronic conditions and an eldest member aged 45+. The result is rounded to the nearest ₹5L.
                                </p>
                                {plan?.notes.map(note => (
                                    <p key={note} className="flex gap-2"><Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />{note}</p>
                                ))}
                                <p className="text-xs text-slate-400">Premiums are indicative market averages, not quotes.</p>
                            </div>
                        </div>
                    </Card>

                    <ExplainResult
                        screen="health-planner"
                        inputs={{ adults, kids, cityTier, employerCover, ownCover: existingCover, riskFactors: risks, eldestAge: user.age }}
                        result={plan ? {
                            recommendedCover: plan.recommendedCover, basePolicy: plan.basePolicy, superTopUp: plan.superTopUp,
                            stillNeeded: plan.personalCoverNeeded, estimatedAnnualPremium: plan.estimatedAnnualPremium, adequacyScore: plan.adequacyScore,
                        } : null}
                    />
                </div>
            </main>
        </div>
    );
};
