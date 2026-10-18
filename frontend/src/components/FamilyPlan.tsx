import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Baby, Check, HeartPulse, Info, ShieldCheck, User, UserRound, Users } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi, type FamilyCoverType, type FamilyPlan as Plan } from '@/lib/api';
import { formatINR } from '@/lib/utils';

type Member = Plan['members'][number];
type Policy = Plan['policies'][number];

const TYPE_LABEL: Record<FamilyCoverType, string> = {
    term_life: 'Term life',
    health: 'Health',
    critical_illness: 'Critical illness',
    personal_accident: 'Accident & disability',
};
const BUY_AS: Record<Policy['buyAs'], string> = { own_policy: 'Own policy', family_floater: 'Family floater', senior_policy: 'Senior policy' };
const PRIORITY: Record<Policy['priority'], string> = {
    essential: 'border-red-500/40 text-red-700 dark:text-red-400',
    recommended: 'border-blue-500/40 text-blue-700 dark:text-blue-400',
    optional: 'border-border text-muted-foreground',
};

const memberName = (m: Member) => {
    const n = m.id.split('-')[1];
    return { you: 'You', spouse: 'Partner', child: `Child ${n}`, parent: `Parent ${n}`, sibling: `Sibling ${n}` }[m.role];
};
const memberIcon = (m: Member) => ({ you: User, spouse: UserRound, child: Baby, parent: Users, sibling: UserRound }[m.role]);

/** Per-person insurance plan: who needs which cover, how to buy it, and what to check in the policy. */
export const FamilyPlan: React.FC = () => {
    const { user } = useApp();
    const [plan, setPlan] = useState<Plan | null>(null);
    const [disclaimer, setDisclaimer] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        ShieldIQApi.getFamilyPlan().then(res => {
            if (cancelled) return;
            if (res?.success) {
                setPlan(res.data);
                setDisclaimer(res.disclaimer);
                setError(null);
            } else setError(res?.error ?? 'Could not load your family plan.');
        });
        return () => { cancelled = true; };
    }, [user]);

    if (error) return <p role="alert" className="text-sm text-red-600">{error}</p>;
    if (!plan) return <p className="text-sm text-muted-foreground">Loading your family plan…</p>;

    const byId = new Map(plan.members.map(m => [m.id, m]));
    const names = (ids: string[]) => ids.map(id => memberName(byId.get(id)!)).join(', ');

    return (
        <section aria-labelledby="family-plan-heading" className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 id="family-plan-heading" className="text-4xl font-black tracking-tight">Family Plan</h1>
                    <p className="text-sm text-muted-foreground font-medium">The cover each person in your household needs, how to buy it, and what to check before you do.</p>
                </div>
                <Card className="p-4 border-border flex flex-wrap gap-x-8 gap-y-2">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">All premiums</p>
                        <p className="font-mono font-bold text-lg">{formatINR(plan.totalAnnualPremium)}/yr</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Beyond your plan</p>
                        <p className="font-mono font-bold text-lg">+{formatINR(plan.additionalAnnualPremium)}/yr</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Of household income</p>
                        <p className="font-mono font-bold text-lg">{plan.shareOfHouseholdIncome}%</p>
                    </div>
                </Card>
            </div>
            <p className="text-xs text-muted-foreground">
                "Beyond your plan" is cover for your partner, siblings, and your own critical illness and accident cover, which the Dashboard and Affordability totals don't include yet.
            </p>

            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {plan.members.map(m => {
                    const Icon = memberIcon(m);
                    const held = plan.policies.filter(p => p.covers.includes(m.id));
                    return (
                        <li key={m.id}>
                            <Card className="h-full p-5 border-border space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0"><Icon className="w-5 h-5" aria-hidden="true" /></span>
                                    <div className="min-w-0">
                                        <h2 className="font-black text-base">{memberName(m)}</h2>
                                        <p className="text-xs text-muted-foreground">
                                            {m.age === null ? 'Age not given' : `Age ${m.age}${m.ageAssumed ? ' (assumed)' : ''}`}
                                            {m.earning ? ' · Earning' : ''}
                                        </p>
                                    </div>
                                </div>
                                <ul className="space-y-2 text-sm">
                                    {held.map(p => (
                                        <li key={p.id} className="flex items-start justify-between gap-3">
                                            <span className="flex items-start gap-1.5">
                                                {p.status === 'covered'
                                                    ? <Check className="w-4 h-4 mt-0.5 shrink-0 text-green-600" aria-hidden="true" />
                                                    : <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" aria-hidden="true" />}
                                                <span>
                                                    <span className="font-bold">{TYPE_LABEL[p.type]}</span>
                                                    <span className="text-muted-foreground"> · {p.covers.length > 1 ? `shared ${BUY_AS[p.buyAs].toLowerCase()}` : BUY_AS[p.buyAs].toLowerCase()}</span>
                                                </span>
                                            </span>
                                            <span className="font-mono text-xs text-right shrink-0">
                                                {formatINR(p.cover)}
                                                <span className="block text-muted-foreground">{p.status === 'covered' ? 'covered' : p.priority}</span>
                                            </span>
                                        </li>
                                    ))}
                                    {m.notNeeded.map(n => (
                                        <li key={n.type} className="text-xs text-muted-foreground">
                                            <span className="font-bold">No {TYPE_LABEL[n.type].toLowerCase()}:</span> {n.reason}
                                        </li>
                                    ))}
                                </ul>
                                {m.notes.map(note => (
                                    <p key={note} className="text-xs text-amber-700 dark:text-amber-400 flex gap-1.5"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />{note}</p>
                                ))}
                            </Card>
                        </li>
                    );
                })}
            </ul>

            <div className="space-y-3">
                <h2 className="text-lg font-black uppercase tracking-tight">Policies in detail</h2>
                <ul className="space-y-3">
                    {plan.policies.map(p => (
                        <li key={p.id}>
                            <Card className="p-5 border-border space-y-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <h3 className="font-black flex items-center gap-2">
                                            {p.type === 'health' && <HeartPulse className="w-4 h-4 text-blue-600" aria-hidden="true" />}
                                            {TYPE_LABEL[p.type]} · {BUY_AS[p.buyAs]}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">For {names(p.covers)}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {p.status === 'covered'
                                            ? <Badge variant="outline" className="border-green-500/40 text-green-700 dark:text-green-400">Covered</Badge>
                                            : <Badge variant="outline" className={PRIORITY[p.priority]}>{p.priority}</Badge>}
                                    </div>
                                </div>
                                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                    <div><dt className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cover</dt><dd className="font-mono font-bold">{formatINR(p.cover)}</dd></div>
                                    <div><dt className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">You hold</dt><dd className="font-mono">{formatINR(p.existing)}</dd></div>
                                    <div><dt className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Est. premium</dt><dd className="font-mono">{p.status === 'covered' ? '—' : `${formatINR(p.annualPremium)}/yr`}</dd></div>
                                </dl>
                                <p className="text-sm text-muted-foreground">{p.reason}</p>
                                {p.lookFor.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Check in the policy wording</p>
                                        <ul className="space-y-1.5">
                                            {p.lookFor.map(l => (
                                                <li key={l.feature} className="text-xs flex gap-1.5">
                                                    <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-600" aria-hidden="true" />
                                                    <span><span className="font-bold">{l.feature}.</span> <span className="text-muted-foreground">{l.why}</span></span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </Card>
                        </li>
                    ))}
                </ul>
            </div>
            <p className="text-[11px] text-muted-foreground">{disclaimer}</p>
        </section>
    );
};
