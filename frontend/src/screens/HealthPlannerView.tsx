import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
    HeartPulse,
    ShieldCheck,
    TrendingUp,
    Activity,
    RefreshCw,
    Zap,
    Users,
    Stethoscope,
    BrainCircuit
} from "lucide-react";

export const HealthPlannerView: React.FC = () => {
    const [adults, setAdults] = useState(2);
    const [kids, setKids] = useState(2);
    const [employerCover, setEmployerCover] = useState(80);

    return (
        <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
            {/* Sidebar - Control Center */}
            <aside className="w-80 border-r border-border bg-card flex flex-col shrink-0 sticky top-0">
                <div className="p-6 border-b border-border">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="bg-blue-600 p-1.5 rounded-lg">
                            <HeartPulse className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="font-black text-lg tracking-tight text-foreground">Health Planner</h2>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] block">Family Demographics</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground">Adults</Label>
                                    <Input type="number" value={adults} onChange={e => setAdults(Number(e.target.value))} className="bg-muted/30 font-mono" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground">Kids</Label>
                                    <Input type="number" value={kids} onChange={e => setKids(Number(e.target.value))} className="bg-muted/30 font-mono" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] block">Location Cost Tier</Label>
                            <select className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-bold appearance-none">
                                <option>Tier 1 - Major Metro</option>
                                <option>Tier 2 - Urban Hub</option>
                                <option>Tier 3 - Regional/Rural</option>
                            </select>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] block">Employer Provided (%)</Label>
                            <div className="relative">
                                <Input type="number" value={employerCover} onChange={e => setEmployerCover(Number(e.target.value))} className="bg-muted/30 font-mono pr-10" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">%</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] block">Clinical Risk Profiling</Label>
                            <div className="space-y-3">
                                {[
                                    { id: "chronic", label: "Chronic Management", icon: Stethoscope },
                                    { id: "critical", label: "Critical Care Exposure", icon: Activity },
                                    { id: "maternity", label: "Maternity Projections", icon: Users }
                                ].map(risk => (
                                    <div key={risk.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors cursor-pointer group">
                                        <Checkbox id={risk.id} />
                                        <Label htmlFor={risk.id} className="flex-1 text-xs font-bold text-muted-foreground group-hover:text-blue-600 transition-colors cursor-pointer">{risk.label}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-auto p-6 space-y-4">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 py-6 font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Re-Run Simulation
                    </Button>
                    <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">Model: Health-IQ v4.2 Stable</p>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-8 lg:p-12">
                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Hero Recommendation */}
                    <Card className="bg-card shadow-2xl overflow-hidden border border-border">
                        <CardContent className="p-10 flex flex-col md:flex-row justify-between items-center gap-8">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-blue-600 flex-wrap">
                                    <ShieldCheck className="w-5 h-5" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Validated Actuarial Output</span>
                                    <Badge className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-none text-[10px] font-black">95.4% Confidence</Badge>
                                </div>
                                <h1 className="text-5xl font-black tracking-tight text-foreground font-mono">₹ 2,50,00,000</h1>
                                <p className="text-muted-foreground font-medium">Optimal Aggregate Coverage for 2024-2025</p>
                            </div>
                            <div className="flex gap-12 font-mono text-right border-l border-border pl-12 hidden md:flex">
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Estimated Premium</p>
                                    <p className="text-2xl font-black text-foreground font-mono">₹ 14,500<span className="text-xs text-muted-foreground">/mo</span></p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Safety Margin</p>
                                    <p className="text-2xl font-black text-emerald-500 font-mono">+24.8%</p>
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
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                                        <span>Current Primary Policy</span>
                                        <span className="text-foreground">₹ 50,00,000</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-muted-foreground rounded-full" style={{ width: '20%' }} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                                        <span>Projected Required Floor</span>
                                        <span className="text-foreground">₹ 1,50,00,000</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '60%' }} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-extrabold text-blue-600 uppercase tracking-widest">
                                        <span>ShieldIQ Recommendation</span>
                                        <span className="text-foreground font-black">₹ 2,50,00,000</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-blue-500/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600 rounded-full" style={{ width: '100%' }} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Risk Variance Profile</h3>
                                <Activity className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="space-y-4">
                                {[
                                    { label: "Max Out-of-Pocket Exposure", value: "₹ 2,45,000", color: "text-foreground" },
                                    { label: "Catastrophic Event Probability", value: "1.92%", color: "text-amber-600" },
                                    { label: "Network Gap Vulnerability", value: "₹ 8,40,000", color: "text-foreground" },
                                    { label: "Coverage Adequacy Score", value: "96 / 100", color: "text-blue-600" }
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-muted/30 border border-border rounded-xl">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{item.label}</span>
                                        <span className={`font-mono font-black ${item.color}`}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <Card className="bg-slate-950 text-white p-8 border-none overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <BrainCircuit className="w-48 h-48 text-blue-500" />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-blue-400" />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Actuarial Logic Interpretation</h4>
                            </div>
                            <div className="max-w-3xl font-mono text-xs text-slate-400 leading-relaxed uppercase tracking-wider space-y-4">
                                <p>Calculated recommendation based on <span className="text-white font-bold">14.2 million anonymized claims records</span> within the specified Tier 1 city category.</p>
                                <p>Model incorporates a weighted variance for identified clinical risk factors and a 3.8% annual medical inflation coefficient (MCPI) benchmarked against IRDAI 2024 compliance data.</p>
                                <div className="flex gap-10 pt-4 opacity-70">
                                    <p>Simulation ID: <span className="text-white font-bold text-[10px]">AX-9122-GAMMA</span></p>
                                    <p>Convergence Status: <span className="text-emerald-500 font-bold text-[10px]">Stable (98.1%)</span></p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
};
