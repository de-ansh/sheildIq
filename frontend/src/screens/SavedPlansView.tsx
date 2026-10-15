import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    FileText,
    ShieldCheck,
    AlertCircle,
    Calendar,
    Download,
    PlusCircle,
    CheckCircle2,
    Search,
    ExternalLink,
    Clock,
    Sparkles,
    Trash2,
    Eye
} from "lucide-react";
import { useApp } from '@/lib/AppContext';

interface SavedPlan {
    id: string;
    name: string;
    category: string;
    coverageAmount: number;
    monthlyPremium: number;
    status: 'Adequate' | 'Gap Detected' | 'Incomplete' | 'Archived';
    lastModified: string;
    description: string;
}

const initialSavedPlans: SavedPlan[] = [
    {
        id: 'SIQ-992-X',
        name: 'FY26 Core Comprehensive Portfolio',
        category: 'OmniShield Bundle',
        coverageAmount: 2750000,
        monthlyPremium: 450,
        status: 'Adequate',
        lastModified: '2026-10-14',
        description: 'Primary deployed portfolio combining pure term life, health floater, and critical illness indemnity.'
    },
    {
        id: 'SIQ-104-Y',
        name: 'Retirement Acceleration Strategy',
        category: 'Term Life Max',
        coverageAmount: 3500000,
        monthlyPremium: 580,
        status: 'Incomplete',
        lastModified: '2026-09-28',
        description: 'Exploratory setup testing increasing term riders with mortgage debt clearance.'
    },
    {
        id: 'SIQ-882-B',
        name: 'Disability & Trauma Shield v2',
        category: 'Critical Illness',
        coverageAmount: 1200000,
        monthlyPremium: 165,
        status: 'Adequate',
        lastModified: '2026-08-15',
        description: 'Standalone disability income continuity for tech lead occupational hazards.'
    },
    {
        id: 'SIQ-045-Z',
        name: 'Tier 1 Metro Health Floater',
        category: 'Health Floater',
        coverageAmount: 1000000,
        monthlyPremium: 280,
        status: 'Gap Detected',
        lastModified: '2026-07-02',
        description: 'Super top-up model with $25k deductible; identified 15% co-pay exposure.'
    },
    {
        id: 'SIQ-012-A',
        name: 'FY25 Archive - Baseline Term',
        category: 'Term Life',
        coverageAmount: 1500000,
        monthlyPremium: 145,
        status: 'Archived',
        lastModified: '2025-12-20',
        description: 'Legacy individual life policy prior to dependents addition.'
    }
];

export const SavedPlansView: React.FC = () => {
    const { setCurrentScreen, setSelectedPolicyId } = useApp();

    const [plans, setPlans] = useState<SavedPlan[]>(initialSavedPlans);
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPlanName, setNewPlanName] = useState('');

    const filteredPlans = plans.filter(p => {
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const handleCreatePlan = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPlanName.trim()) return;

        const newEntry: SavedPlan = {
            id: `SIQ-${Math.floor(100 + Math.random() * 900)}-CUSTOM`,
            name: newPlanName,
            category: 'Custom Bundle',
            coverageAmount: 2500000,
            monthlyPremium: 410,
            status: 'Adequate',
            lastModified: new Date().toISOString().split('T')[0],
            description: 'Custom configuration generated from live actuarial adjustments.'
        };

        setPlans([newEntry, ...plans]);
        setNewPlanName('');
        setIsCreateModalOpen(false);
    };

    const handleDeletePlan = (id: string) => {
        setPlans(plans.filter(p => p.id !== id));
    };

    const getStatusBadge = (status: SavedPlan['status']) => {
        switch (status) {
            case 'Adequate':
                return <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold text-[10px]">Adequate</Badge>;
            case 'Gap Detected':
                return <Badge className="bg-amber-500/10 text-amber-600 border-none font-bold text-[10px]">Gap Detected</Badge>;
            case 'Incomplete':
                return <Badge className="bg-blue-500/10 text-blue-600 border-none font-bold text-[10px]">Incomplete</Badge>;
            case 'Archived':
                return <Badge className="bg-slate-500/10 text-slate-500 border-none font-bold text-[10px]">Archived</Badge>;
        }
    };

    const activePlan = plans[0];

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

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentScreen('dashboard')}
                        className="font-bold border-border"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Save Current Plan
                    </Button>
                </div>
            </div>

            {/* Active Deployed Plan Highlight Card */}
            {activePlan && (
                <Card className="border-border shadow-md bg-gradient-to-br from-card via-card to-blue-500/5 relative overflow-hidden p-8">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div className="space-y-3 max-w-3xl">
                            <div className="flex items-center gap-3">
                                <Badge className="bg-blue-600 text-white border-none text-[10px] font-bold uppercase tracking-wider">
                                    Currently Deployed
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
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Coverage: ${(activePlan.coverageAmount / 1000).toLocaleString()}k
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-indigo-600" /> Premium: ${activePlan.monthlyPremium}/mo
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
                                onClick={() => {
                                    setSelectedPolicyId('POL-8821');
                                    setCurrentScreen('deepdive');
                                }}
                                className="font-bold border-border"
                            >
                                Inspect Deep-Dive <ExternalLink className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
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
                <div className="overflow-x-auto">
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
                                        ${(plan.coverageAmount / 1000).toLocaleString()}k
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
