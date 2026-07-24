import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowRightLeft,
    Bookmark,
    ChevronDown,
    FileText,
    Filter,
    Star,
    Zap,
    Share2,
    Trash2,
    LayoutGrid,
    List,
    Flame
} from "lucide-react";

export const ComparisonView: React.FC = () => {
    const [activeTab, setActiveTab] = useState("compare");

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 font-sans bg-background text-foreground">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <header className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight">Strategy Vault & Comparison</h1>
                    <p className="text-muted-foreground font-medium max-w-2xl">
                        Objective technical evaluation of insurance products against your unique risk profile.
                    </p>
                </header>
                <div className="flex gap-2">
                    <Button variant="outline" className="font-bold h-11">
                        <Filter className="w-4 h-4 mr-2" /> Global Filters
                    </Button>
                    <Button className="font-bold h-11 bg-blue-600 hover:bg-blue-700">
                        <FileText className="w-4 h-4 mr-2" /> Export Summary
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="compare" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="bg-muted p-1 rounded-xl h-14 border border-border">
                    <TabsTrigger value="compare" className="px-8 rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <ArrowRightLeft className="w-4 h-4 mr-2" /> Live Comparison
                    </TabsTrigger>
                    <TabsTrigger value="saved" className="px-8 rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Bookmark className="w-4 h-4 mr-2" /> Saved Strategies
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="compare" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    {/* Context Bar */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: "Insured", val: "Male, 32Y", icon: "user" },
                            { label: "Location", val: "Tier 1 Hub", icon: "map-pin" },
                            { label: "Sum Insured", val: "₹ 1.0 Cr", icon: "shield" },
                            { label: "Medical History", val: "Optimized", icon: "activity" }
                        ].map((item, i) => (
                            <div key={i} className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-4">
                                <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600">
                                    <Zap className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">{item.label}</p>
                                    <p className="text-sm font-bold text-foreground">{item.val}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Comparison Table */}
                    <Card className="border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                        <CardHeader className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-muted border-b border-border">
                                        <tr>
                                            <th className="px-6 py-5 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Insurer & Plan</th>
                                            <th className="px-4 py-5 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">Premium (₹)</th>
                                            <th className="px-4 py-5 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Settlement %</th>
                                            <th className="px-4 py-5 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Wait Pd (Y)</th>
                                            <th className="px-4 py-5 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Risk Fit</th>
                                            <th className="px-6 py-5"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {[
                                            { name: "HDFC ERGO", plan: "Optima Secure", prem: "14,842", csr: "98.4", wait: "2.0", fit: 94, recommended: true },
                                            { name: "Care Health", plan: "Care Supreme", prem: "12,120", csr: "95.2", wait: "4.0", fit: 81, recommended: false },
                                            { name: "Star Health", plan: "Assure Policy", prem: "10,850", csr: "92.8", wait: "3.0", fit: 67, recommended: false }
                                        ].map((policy, i) => (
                                            <tr key={i} className={`group hover:bg-muted transition-colors ${policy.recommended ? "bg-blue-50/30 dark:bg-blue-900/5" : ""}`}>
                                                <td className="px-6 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center font-black text-blue-600 text-[10px] overflow-hidden p-1 italic">
                                                            LOGO
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-black text-foreground uppercase tracking-tight">{policy.name}</p>
                                                                {policy.recommended && <Badge className="bg-blue-600 h-4 text-[8px] font-black uppercase">Alpha Fit</Badge>}
                                                            </div>
                                                            <p className="text-xs font-semibold text-muted-foreground">{policy.plan}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-6 text-right font-mono font-black text-foreground text-sm tracking-tight">{policy.prem}</td>
                                                <td className="px-4 py-6 text-center text-sm font-bold text-foreground/80">{policy.csr}%</td>
                                                <td className="px-4 py-6 text-center text-sm font-bold text-foreground/80">{policy.wait}Y</td>
                                                <td className="px-4 py-6 text-center">
                                                    <div className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full border font-mono font-black text-xs ${policy.fit > 80 ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600" : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600"}`}>
                                                        {policy.fit}/100
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <Button variant="ghost" size="icon" className="group-hover:text-blue-600">
                                                        <ChevronDown className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardHeader>
                    </Card>
                </TabsContent>

                <TabsContent value="saved" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <aside className="space-y-6">
                            <Card className="border-border shadow-sm">
                                <CardHeader className="p-6 pb-0">
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Plan Repositories</h4>
                                </CardHeader>
                                <CardContent className="p-6 space-y-8">
                                    <div className="space-y-1">
                                        {[
                                            { label: "All Vaults", icon: List, active: true },
                                            { label: "Life Strategies", icon: Bookmark, active: false },
                                            { label: "Health Models", icon: Star, active: false },
                                            { label: "Combo Drafts", icon: LayoutGrid, active: false }
                                        ].map((item, i) => (
                                            <Button key={i} variant={item.active ? "secondary" : "ghost"} className={`w-full justify-start font-bold h-11 ${item.active ? "bg-blue-100/50 dark:bg-blue-900/20 text-blue-600" : "text-slate-500 hover:text-slate-900"}`}>
                                                <item.icon className="w-4 h-4 mr-3" />
                                                {item.label}
                                            </Button>
                                        ))}
                                    </div>

                                    <div className="space-y-4">
                                        <CardDescription className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Audit Status</CardDescription>
                                        <div className="space-y-3">
                                            {["Fully Adequate", "Gaps Found", "Incomplete"].map((status, i) => (
                                                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                                                    <input type="checkbox" className="rounded-md border-border text-blue-600" />
                                                    <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">{status}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 py-6 font-black uppercase tracking-widest text-xs">
                                Create New Strategy
                            </Button>
                        </aside>

                        <div className="lg:col-span-2 space-y-6">
                            {/* Active Analysis Hero */}
                            <Card className="border-none shadow-2xl overflow-hidden bg-slate-950 text-white flex flex-col md:flex-row min-h-[240px]">
                                <div className="md:w-2/5 relative overflow-hidden bg-blue-600/10">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent p-8 flex items-end">
                                        <Flame className="w-40 h-40 text-blue-500 opacity-20 absolute -right-10 -bottom-10" />
                                        <div className="relative z-10">
                                            <Badge className="bg-amber-500 text-white border-none font-black text-[9px] uppercase tracking-widest mb-2 px-3">Priority Audit</Badge>
                                            <p className="text-2xl font-black leading-tight">Standard Safe Plan Q2 Update</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 p-8 space-y-6 flex flex-col justify-center">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Coverage Gap</p>
                                            <p className="text-2xl font-black font-mono">₹ 25,00,000</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Risk Status</p>
                                            <p className="text-sm font-bold text-amber-500 uppercase tracking-widest italic">Moderate Risk</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-4 border-t border-white/10">
                                        <Button className="bg-white text-slate-950 hover:bg-slate-100 font-bold px-8">Resolve Gaps</Button>
                                        <Button variant="outline" className="border-white/20 hover:bg-white/10 text-white font-bold px-8">View Logic</Button>
                                    </div>
                                </div>
                            </Card>

                            {/* Archived Strategies List */}
                            <div className="space-y-4">
                                {[
                                    { name: "Comprehensive Executive", type: "Combo", date: "Apr 28, 2024", status: "Adequate" },
                                    { name: "Legacy Estate Strategy", type: "Life", date: "Apr 15, 2024", status: "Incomplete" },
                                    { name: "HSA Optimization Draft", type: "Health", date: "Mar 30, 2024", status: "Gap Found" }
                                ].map((plan, i) => (
                                    <Card key={i} className="p-6 group hover:border-blue-200 dark:hover:border-blue-800 transition-all hover:shadow-lg border-border">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-6">
                                                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-blue-600 transition-colors">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-foreground tracking-tight group-hover:text-blue-600 transition-colors">{plan.name}</h4>
                                                    <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                                        <span className="flex items-center gap-1"><LayoutGrid className="w-3 h-3" /> {plan.type}</span>
                                                        <span>•</span>
                                                        <span>{plan.date}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <Badge className={`px-3 py-0.5 rounded-full font-black text-[9px] uppercase tracking-widest ${plan.status === 'Adequate' ? 'bg-emerald-50 text-emerald-600 border-none' : plan.status === 'Incomplete' ? 'bg-slate-100 text-slate-500 border-none' : 'bg-amber-50 text-amber-600 border-none'}`}>
                                                    {plan.status}
                                                </Badge>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                                                        <Share2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};
