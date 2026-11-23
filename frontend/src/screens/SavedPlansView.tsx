import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, PlusCircle, Trash2 } from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi, type SavedPlan } from '@/lib/api';
import { formatINR, toCsv } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

const STATUS_FOR_RATING: Record<string, SavedPlan['status']> = {
    Optimal: 'Adequate',
    Adequate: 'Adequate',
    Vulnerable: 'Gap Detected',
    'High Risk': 'Gap Detected',
};

const STATUS_STYLE: Record<SavedPlan['status'], string> = {
    Adequate: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    'Gap Detected': 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    Incomplete: 'bg-blue-500/10 text-blue-600',
    Archived: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

export const SavedPlansView: React.FC = () => {
    const { user, strategy } = useApp();
    const { t } = useI18n();

    const [plans, setPlans] = useState<SavedPlan[] | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPlanName, setNewPlanName] = useState('');

    useEffect(() => {
        if (!user.isLoggedIn) return;
        ShieldIQApi.getPlans().then(res => {
            if (res && res.success && Array.isArray(res.data)) setPlans(res.data);
            else {
                setPlans([]);
                setActionError(t('sp.loadError'));
            }
        });
    }, [user.isLoggedIn, t]);

    // Oldest first, then today's live strategy, so changes read left to right in time.
    const history = [
        ...(plans ?? []).filter(p => p.snapshot).reverse().map(p => ({ key: p.id, date: p.lastModified, label: p.name, ...p.snapshot! })),
        ...(strategy ? [{
            key: 'now', date: t('sp.today'), label: t('sp.currentProfile'), score: strategy.score, lifeGap: strategy.life.gap,
            healthGap: strategy.health.gap + (strategy.parentsHealth?.gap ?? 0), annualPremium: strategy.affordability.estimatedAnnualPremium,
        }] : []),
    ];

    const handleCreatePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPlanName.trim() || !strategy) return;

        // Snapshot of the user's current strategy, so a saved plan records real numbers.
        const res = await ShieldIQApi.createPlan({
            name: newPlanName.trim(),
            category: 'Protection Strategy',
            coverageAmount: strategy.life.totalNeed + strategy.health.recommendedCover,
            monthlyPremium: Math.round(strategy.affordability.estimatedAnnualPremium / 12),
            status: STATUS_FOR_RATING[strategy.rating],
            description: `Score ${strategy.score}/100 (${strategy.rating}). Life need ${formatINR(strategy.life.totalNeed)}, gap ${formatINR(strategy.life.gap)}; health need ${formatINR(strategy.health.recommendedCover)}, gap ${formatINR(strategy.health.gap)}.`,
        });
        if (res && res.success) {
            setPlans(prev => [res.data, ...(prev ?? [])]);
            setNewPlanName('');
            setIsCreateModalOpen(false);
            setActionError(null);
        } else {
            setActionError(t('sp.saveError'));
        }
    };

    const handleDeletePlan = async (id: string) => {
        const res = await ShieldIQApi.deletePlan(id);
        if (res && res.success) setPlans(prev => (prev ?? []).filter(p => p.id !== id));
        else setActionError(t('sp.deleteError'));
    };

    const handleExportCsv = () => {
        const url = URL.createObjectURL(new Blob([toCsv(plans ?? [])], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `shieldiq-plans-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const statusBadge = (status: SavedPlan['status']) => (
        <Badge className={`${STATUS_STYLE[status]} border-none font-bold text-xs`}>{t(`sp.status.${status}`)}</Badge>
    );
    const th = "px-6 py-3 text-xs font-bold text-muted-foreground";

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 text-foreground font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-border">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight text-foreground">{t('sp.title')}</h1>
                    <p className="text-muted-foreground text-sm font-medium">{t('sp.subtitle')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <Button variant="outline" onClick={handleExportCsv} disabled={!plans?.length} className="font-bold border-border">
                        <Download className="w-4 h-4 mr-2" /> {t('sp.export')}
                    </Button>
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        disabled={!strategy}
                        title={strategy ? undefined : t('sp.saveDisabled')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" /> {t('sp.save')}
                    </Button>
                </div>
            </div>

            {actionError && <p role="alert" className="text-sm font-medium text-red-600">{actionError}</p>}
            {plans?.length === 0 && !actionError && (
                <p className="text-sm text-muted-foreground">{t(strategy ? 'sp.empty' : 'sp.emptyNoProfile')}</p>
            )}

            {history.length >= 2 && (
                <Card className="border-border shadow-sm overflow-hidden">
                    <div className="p-6 pb-2">
                        <h2 className="text-lg font-black text-foreground tracking-tight">{t('sp.progress')}</h2>
                        <p className="text-sm text-muted-foreground">{t('sp.progressSub')}</p>
                    </div>
                    <div className="relative overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left">
                                    <th className={th}>{t('sp.colSaved')}</th>
                                    <th className={th}>{t('sp.colPlan')}</th>
                                    <th className={`${th} text-right`}>{t('sp.colScore')}</th>
                                    <th className={`${th} text-right`}>{t('sp.colLifeGap')}</th>
                                    <th className={`${th} text-right`}>{t('sp.colHealthGap')}</th>
                                    <th className={`${th} text-right`}>{t('sp.colPremium')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((h, i) => {
                                    const change = i > 0 ? h.score - history[i - 1].score : 0;
                                    return (
                                        <tr key={h.key} className="border-t border-border font-mono">
                                            <td className="px-6 py-3 font-sans text-muted-foreground">{h.date}</td>
                                            <td className="px-6 py-3 font-sans font-bold">{h.label}</td>
                                            <td className="px-6 py-3 text-right">
                                                {h.score}
                                                {change !== 0 && (
                                                    <span className={`ml-2 text-xs ${change > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                                                        {change > 0 ? `▲ ${change}` : `▼ ${-change}`}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-right">{formatINR(h.lifeGap)}</td>
                                            <td className="px-6 py-3 text-right">{formatINR(h.healthGap)}</td>
                                            <td className="px-6 py-3 text-right">{formatINR(h.annualPremium)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {!!plans?.length && (
                <Card className="border-border shadow-sm overflow-hidden">
                    <div className="relative overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/40 border-b border-border">
                                <tr>
                                    <th className={th}>{t('sp.colPlan')}</th>
                                    <th className={th}>{t('sp.colCoverage')}</th>
                                    <th className={th}>{t('sp.colStatus')}</th>
                                    <th className={th}>{t('sp.colSaved')}</th>
                                    <th className={`${th} text-right`}><span className="sr-only">{t('sp.colActions')}</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border font-medium">
                                {plans.map(plan => (
                                    <tr key={plan.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-foreground">{plan.name}</div>
                                            <div className="text-xs text-muted-foreground font-normal line-clamp-1 max-w-md">{plan.description}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-foreground">{formatINR(plan.coverageAmount)}</td>
                                        <td className="px-6 py-4">{statusBadge(plan.status)}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{plan.lastModified}</td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeletePlan(plan.id)}
                                                className="text-muted-foreground hover:text-red-500"
                                                title={t('sp.delete')}
                                                aria-label={t('sp.delete')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <Card role="dialog" aria-modal="true" aria-labelledby="save-plan-title" className="w-full max-w-md border-border shadow-2xl bg-card p-6 space-y-6">
                        <div className="space-y-1">
                            <h3 id="save-plan-title" className="text-xl font-black text-foreground tracking-tight">{t('sp.modalTitle')}</h3>
                            <p className="text-sm text-muted-foreground">{t('sp.modalBody')}</p>
                        </div>
                        <form onSubmit={handleCreatePlan} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="plan-name" className="text-xs font-bold text-foreground">{t('sp.name')}</label>
                                <Input
                                    id="plan-name"
                                    value={newPlanName}
                                    onChange={(e) => setNewPlanName(e.target.value)}
                                    placeholder={t('sp.namePlaceholder')}
                                    className="bg-muted/30 border-border"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} className="font-bold border-border">
                                    {t('sp.cancel')}
                                </Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">{t('sp.submit')}</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};
