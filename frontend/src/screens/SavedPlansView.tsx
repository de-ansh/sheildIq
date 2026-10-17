import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    FileText,
    ShieldCheck,
    Calendar,
    Download,
    PlusCircle,
    Search,
    ExternalLink,
    Clock,
    Trash2,
    Eye
} from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi, type SavedPlan } from '@/lib/api';
import { formatINR, toCsv } from '@/lib/utils';

const STATUS_FOR_RATING: Record<string, SavedPlan['status']> = {
    Optimal: 'Adequate',
    Adequate: 'Adequate',
    Vulnerable: 'Gap Detected',
    'High Risk': 'Gap Detected',
};

export const SavedPlansView: React.FC = () => {
    const { setCurrentScreen, user, strategy } = useApp();

    const [plans, setPlans] = useState<SavedPlan[] | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPlanName, setNewPlanName] = useState('');

    useEffect(() => {
        if (!user.isLoggedIn) return;
        ShieldIQApi.getPlans().then(res => {
            if (res && res.success && Array.isArray(res.data)) setPlans(res.data);
            else {
                setPlans([]);
                setActionError(res?.error || 'Could not load your plans. Please try again.');
            }
        });
    }, [user.isLoggedIn]);

    const filteredPlans = (plans ?? []).filter(p => {
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    // Oldest first, then today's live strategy, so changes read left to right in time.
    const history = [
        ...(plans ?? []).filter(p => p.snapshot).reverse().map(p => ({ key: p.id, date: p.lastModified, label: p.name, ...p.snapshot! })),
        ...(strategy ? [{
            key: 'now', date: 'Today', label: 'Current profile', score: strategy.score, lifeGap: strategy.life.gap,
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
            setActionError(res?.error || 'Could not save the plan. Please try again.');
        }
    };

    const handleDeletePlan = async (id: string) => {
        const res = await ShieldIQApi.deletePlan(id);
        if (res && res.success) setPlans(prev => (prev ?? []).filter(p => p.id !== id));
        else setActionError(res?.error || 'Could not delete the plan. Please try again.');
    };

    const handleExportCsv = () => {
        const url = URL.createObjectURL(new Blob([toCsv(filteredPlans)], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `shieldiq-plans-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const getStatusBadge = (status: SavedPlan['status']) => {
        switch (status) {
            case 'Adequate':
                return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-none font-bold text-[10px]">Adequate</Badge>;
            case 'Gap Detected':
                return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-none font-bold text-[10px]">Gap Detected</Badge>;
            case 'Incomplete':
                return <Badge className="bg-blue-500/10 text-blue-600 border-none font-bold text-[10px]">Incomplete</Badge>;
            case 'Archived':
                return <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-none font-bold text-[10px]">Archived</Badge>;
        }
    };

    const activePlan = plans?.[0];

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 text-foreground font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-border">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                        <span>PORTFOLIO ARCHIVE</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30 text-blue-600 bg-blue-50 dark:bg-blue-950/30">
                            Version Controlled
                        </Badge>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground">Saved Plans & Reports</h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Centralized repository of insurance portfolios, comparison benchmarks, and risk simulations for FY24–FY26.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <Button
                        variant="outline"
                        onClick={handleExportCsv}
                        disabled={filteredPlans.length === 0}
                        className="font-bold border-border"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        disabled={!strategy}
                        title={strategy ? undefined : 'Complete your profile to save a strategy snapshot'}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Save Current Plan
                    </Button>
                </div>
            </div>

            {/* Active Deployed Plan Highlight Card */}
            {actionError && <p role="alert" className="text-sm font-medium text-red-600">{actionError}</p>}
            {plans?.length === 0 && !actionError && (
                <p className="text-sm text-muted-foreground">
                    No saved plans yet. {strategy ? 'Use "Save Current Plan" to snapshot your strategy.' : 'Complete your profile, then save your first strategy.'}
                </p>
            )}

            {activePlan && (
                <Card className="border-border shadow-md bg-gradient-to-br from-card via-card to-blue-500/5 relative overflow-hidden p-8">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div className="space-y-3 max-w-3xl">
                            <div className="flex items-center gap-3">
                                <Badge className="bg-blue-600 text-white border-none text-[10px] font-bold uppercase tracking-wider">
                                    Most Recent
                                </Badge>
                                <span className="text-xs font-mono text-muted-foreground">ID: {activePlan.id}</span>
                                {getStatusBadge(activePlan.status)}
                            </div>
                            <h2 className="text-2xl font-black text-foreground tracking-tight">
                                {activePlan.name}
                            </h2>
                            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                                {activePlan.description}
                            </p>
                            <div className="flex flex-wrap gap-6 text-xs text-muted-foreground pt-2 font-mono">
                                <span className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-blue-600" /> Last Modified: {activePlan.lastModified}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> Coverage: {formatINR(activePlan.coverageAmount)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-indigo-600" /> Premium: {formatINR(activePlan.monthlyPremium)}/mo
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto">
                            <Button
                                onClick={() => setCurrentScreen('analysis')}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            >
                                <Eye className="w-4 h-4 mr-2" /> Analytics View
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setCurrentScreen('comparison')}
                                className="font-bold border-border"
                            >
                                Compare Policies <ExternalLink className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {history.length >= 2 && (
                <Card className="border-border shadow-sm overflow-hidden">
                    <div className="p-6 pb-2">
                        <h3 className="text-lg font-black text-foreground tracking-tight uppercase">Progress Over Time</h3>
                        <p className="text-xs text-muted-foreground">How your score and gaps changed between saved plans.</p>
                    </div>
                    <div className="relative overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left">
                                    <th className="px-6 py-3">Saved</th>
                                    <th className="px-6 py-3">Plan</th>
                                    <th className="px-6 py-3 text-right">Score</th>
                                    <th className="px-6 py-3 text-right">Life Gap</th>
                                    <th className="px-6 py-3 text-right">Health Gap</th>
                                    <th className="px-6 py-3 text-right">Premium / yr</th>
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

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {['All', 'Adequate', 'Gap Detected', 'Incomplete', 'Archived'].map(status => (
                        <Button
                            key={status}
                            variant={statusFilter === status ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter(status)}
                            className={`font-bold text-xs ${statusFilter === status ? 'bg-blue-600 text-white' : 'border-border text-muted-foreground'}`}
                        >
                            {status}
                        </Button>
                    ))}
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search plans or IDs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-muted/30 border-border text-sm"
                    />
                </div>
            </div>

            {/* Catalog Table */}
            <Card className="border-border shadow-sm overflow-hidden">
                <div className="relative overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/40 border-b border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <tr>
                                <th className="p-4 pl-6">Plan Name</th>
                                <th className="p-4">Plan ID</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">Coverage</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Last Modified</th>
                                <th className="p-4 pr-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-medium">
                            {filteredPlans.map(plan => (
                                <tr key={plan.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-foreground">{plan.name}</div>
                                                <div className="text-[11px] text-muted-foreground font-normal line-clamp-1 max-w-sm">
                                                    {plan.description}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-xs text-muted-foreground">{plan.id}</td>
                                    <td className="p-4">
                                        <Badge variant="outline" className="text-[10px] font-mono">
                                            {plan.category}
                                        </Badge>
                                    </td>
                                    <td className="p-4 font-mono font-bold text-foreground">
                                        {formatINR(plan.coverageAmount)}
                                    </td>
                                    <td className="p-4">{getStatusBadge(plan.status)}</td>
                                    <td className="p-4 font-mono text-xs text-muted-foreground">{plan.lastModified}</td>
                                    <td className="p-4 pr-6 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setCurrentScreen('comparison')}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-700"
                                            >
                                                Compare
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeletePlan(plan.id)}
                                                className="text-muted-foreground hover:text-red-500"
                                                title="Delete Plan"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Create Plan Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <Card className="w-full max-w-md border-border shadow-2xl bg-card p-6 space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-foreground tracking-tight">Save Customized Plan</h3>
                            <p className="text-xs text-muted-foreground">
                                Snapshot current portfolio settings, coverage totals, and actuarial parameters.
                            </p>
                        </div>

                        <form onSubmit={handleCreatePlan} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-foreground">Plan Name</label>
                                <Input
                                    value={newPlanName}
                                    onChange={(e) => setNewPlanName(e.target.value)}
                                    placeholder="e.g. Q4 Growth & Term Protection"
                                    className="bg-muted/30 border-border"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="font-bold border-border"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                >
                                    Save Plan
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};
