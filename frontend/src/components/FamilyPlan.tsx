import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Baby, Check, HeartPulse, Info, ShieldCheck, User, UserRound, Users } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi, type FamilyCoverType, type FamilyPlan as Plan } from '@/lib/api';
import { formatINR } from '@/lib/utils';
import { useI18n, type Translate } from '@/lib/i18n';

type Member = Plan['members'][number];
type Policy = Plan['policies'][number];

const typeLabel = (t: Translate, type: FamilyCoverType) => t(`fp.type.${type}`);
const buyAs = (t: Translate, how: Policy['buyAs']) => t(`fp.buy.${how}`);
const PRIORITY: Record<Policy['priority'], string> = {
    essential: 'border-red-500/40 text-red-700 dark:text-red-400',
    recommended: 'border-blue-500/40 text-blue-700 dark:text-blue-400',
    optional: 'border-border text-muted-foreground',
};

const memberName = (t: Translate, m: Member) => t(`fp.role.${m.role}`, { n: m.id.split('-')[1] ?? '' });
const memberIcon = (m: Member) => ({ you: User, spouse: UserRound, child: Baby, parent: Users, sibling: UserRound }[m.role]);

/** Per-person insurance plan: who needs which cover, how to buy it, and what to check in the policy. */
export const FamilyPlan: React.FC = () => {
    const { user } = useApp();
    const { t, tServer } = useI18n();
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
            } else setError(tServer(res?.error) ?? t('fp.loadError'));
        });
        return () => { cancelled = true; };
    }, [user, t, tServer]);

    if (error) return <p role="alert" className="text-sm text-red-600">{error}</p>;
    if (!plan) return <p className="text-sm text-muted-foreground">{t('fp.loading')}</p>;

    const byId = new Map(plan.members.map(m => [m.id, m]));
    const names = (ids: string[]) => ids.map(id => memberName(t, byId.get(id)!)).join(', ');

    return (
        <section aria-labelledby="family-plan-heading" className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 id="family-plan-heading" className="text-4xl font-black tracking-tight">{t('fp.title')}</h1>
                    <p className="text-sm text-muted-foreground font-medium">{t('fp.subtitle')}</p>
                </div>
                <Card className="p-4 border-border flex flex-wrap gap-x-8 gap-y-2">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('fp.allPremiums')}</p>
                        <p className="font-mono font-bold text-lg">{t('fp.perYear', { amount: formatINR(plan.totalAnnualPremium) })}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('fp.beyond')}</p>
                        <p className="font-mono font-bold text-lg">+{t('fp.perYear', { amount: formatINR(plan.additionalAnnualPremium) })}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('fp.shareIncome')}</p>
                        <p className="font-mono font-bold text-lg">{plan.shareOfHouseholdIncome}%</p>
                    </div>
                </Card>
            </div>
            <p className="text-xs text-muted-foreground">
                {t('fp.beyondNote')}
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
                                        <h2 className="font-black text-base">{memberName(t, m)}</h2>
                                        <p className="text-xs text-muted-foreground">
                                            {m.age === null ? t('fp.ageUnknown') : t(m.ageAssumed ? 'fp.ageAssumed' : 'fp.age', { age: m.age })}
                                            {m.earning ? t('fp.earning') : ''}
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
                                                    <span className="font-bold">{typeLabel(t, p.type)}</span>
                                                    <span className="text-muted-foreground"> · {p.covers.length > 1 ? t('fp.shared', { how: buyAs(t, p.buyAs).toLowerCase() }) : buyAs(t, p.buyAs).toLowerCase()}</span>
                                                </span>
                                            </span>
                                            <span className="font-mono text-xs text-right shrink-0">
                                                {formatINR(p.cover)}
                                                <span className="block text-muted-foreground">{p.status === 'covered' ? t('fp.covered') : t(`fp.priority.${p.priority}`)}</span>
                                            </span>
                                        </li>
                                    ))}
                                    {m.notNeeded.map(n => (
                                        <li key={n.type} className="text-xs text-muted-foreground">
                                            <span className="font-bold">{t('fp.notNeeded', { type: typeLabel(t, n.type).toLowerCase() })}</span> {n.reason}
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
                <h2 className="text-lg font-black tracking-tight">{t('fp.details')}</h2>
                <ul className="space-y-3">
                    {plan.policies.map(p => (
                        <li key={p.id}>
                            <Card className="p-5 border-border space-y-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <h3 className="font-black flex items-center gap-2">
                                            {p.type === 'health' && <HeartPulse className="w-4 h-4 text-blue-600" aria-hidden="true" />}
                                            {typeLabel(t, p.type)} · {buyAs(t, p.buyAs)}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">{t('fp.for', { names: names(p.covers) })}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {p.status === 'covered'
                                            ? <Badge variant="outline" className="border-green-500/40 text-green-700 dark:text-green-400">{t('fp.coveredBadge')}</Badge>
                                            : <Badge variant="outline" className={PRIORITY[p.priority]}>{t(`fp.priority.${p.priority}`)}</Badge>}
                                    </div>
                                </div>
                                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                    <div><dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('fp.cover')}</dt><dd className="font-mono font-bold">{formatINR(p.cover)}</dd></div>
                                    <div><dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('fp.youHold')}</dt><dd className="font-mono">{formatINR(p.existing)}</dd></div>
                                    <div><dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('fp.estPremium')}</dt><dd className="font-mono">{p.status === 'covered' ? '—' : t('fp.perYear', { amount: formatINR(p.annualPremium) })}</dd></div>
                                </dl>
                                <p className="text-sm text-muted-foreground">{p.reason}</p>
                                {p.lookFor.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('fp.checkWording')}</p>
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
            <p className="text-xs text-muted-foreground">{disclaimer}</p>
        </section>
    );
};
