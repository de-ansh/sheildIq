import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
    Skull,
    Stethoscope,
    Accessibility,
    RefreshCw,
    Bell,
    Activity,
    BrainCircuit,
    Zap,
    CheckCircle2,
    TrendingDown
} from "lucide-react";

export const RiskSimulatorView: React.FC = () => {
    const [scenario, setScenario] = useState<"death" | "illness" | "disability">("illness");
    const [cost, setCost] = useState([120000]);
    const [years, setYears] = useState(5);
    const [inflation, setInflation] = useState([4.2]);

    return (
        <div className="flex flex-col h-screen bg-background text-foreground font-sans overflow-hidden">
            {/* Top Nav Scenario Selector */}
            <header className="flex items-center justify-between border-b border-border bg-card px-8 py-4 sticky top-0 z-50">
                <div className="flex items-center gap-4 text-blue-600">
                    <div className="bg-blue-600 p-2 rounded-lg text-white">
                        <Activity className="w-5 h-5" />
                    </div>
                    <h2 className="text-foreground text-lg font-black tracking-tight uppercase">Risk Simulator</h2>
                </div>

                <nav className="flex items-center bg-muted p-1 rounded-xl">
                    {[
                        { id: "death", label: "Early Death", icon: Skull },
                        { id: "illness", label: "Critical Illness", icon: Stethoscope },
                        { id: "disability", label: "Total Disability", icon: Accessibility }
                    ].map(s => (
                        <button
                            key={s.id}
                            onClick={() => setScenario(s.id as "death" | "illness" | "disability")}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black transition-all uppercase tracking-widest ${scenario === s.id ? "bg-background shadow-sm text-blue-600" : "text-muted-foreground hover:bg-background/50"}`}
                        >
                            <s.icon className="w-4 h-4" />
                            {s.label}
                        </button>
                    ))}
                </nav>

                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground">
                        <Bell className="w-5 h-5" />
                    </Button>
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 border-2 border-blue-600/20 overflow-hidden font-black text-blue-600 flex items-center justify-center text-xs italic">
                        JH
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Left Sidebar - Controls */}
                <aside className="w-full lg:w-80 border-r border-border bg-card p-8 space-y-10 overflow-y-auto">
                    <div className="space-y-2">
                        <h3 className="font-black text-foreground uppercase tracking-tight">Stress Test Controls</h3>
                        <p className="text-xs text-muted-foreground font-medium tracking-tight">Adjust event severity parameters.</p>
                    </div>

                    <div className="space-y-10">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <Label>Treatment Cost</Label>
                                <span className="text-blue-600 font-mono">₹ {(cost[0] / 1000).toFixed(1)}L</span>
                            </div>
                            <Slider value={cost} onValueChange={setCost} max={500000} min={10000} step={5000} />
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <Label>Recovery Window</Label>
                                <span className="text-blue-600 font-mono">{years} Years</span>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {[1, 2, 5, 8, 10].map(yr => (
                                    <button
                                        key={yr}
                                        onClick={() => setYears(yr)}
                                        className={`py-2 rounded-lg font-black text-[10px] border transition-all ${years === yr ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-muted/30 border-border text-muted-foreground hover:border-blue-200"}`}
                                    >
                                        {yr}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <Label>Medical Inflation</Label>
                                <span className="text-blue-600 font-mono">{inflation[0]}%</span>
                            </div>
                            <Slider value={inflation} onValueChange={setInflation} max={15} min={0} step={0.1} />
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lifestyle Scaling</Label>
                            <select className="w-full bg-muted/30 border-border rounded-lg text-xs font-bold py-2.5">
                                <option>Maintain Current Standard</option>
                                <option>Optimized (-10%)</option>
                                <option>Basic Survival (-25%)</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-6">
                        <Button className="w-full bg-slate-900 border-none dark:bg-slate-700 py-6 font-black uppercase tracking-widest text-[10px]">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Recalculate Model
                        </Button>
                    </div>
                </aside>

                {/* Main Simulation View */}
                <div className="flex-1 p-8 lg:p-12 overflow-y-auto space-y-8 pb-32">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card className="md:col-span-2 border-border shadow-sm overflow-hidden">
                            <CardContent className="p-8 flex flex-col md:flex-row justify-between items-center gap-8 group hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Projected Shortfall Age</p>
                                    <h3 className="text-6xl font-black text-red-500 font-mono tracking-tighter">52<span className="text-lg font-bold text-muted-foreground/30 ml-2 uppercase tracking-widest">Years Old</span></h3>
                                    <p className="text-xs text-muted-foreground font-medium italic">Portfolio depletion occurs 14 years post-event.</p>
                                </div>
                                <div className="h-20 w-px bg-muted hidden md:block" />
                                <div className="space-y-2 text-right">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Est. Funding Gap</p>
                                    <h3 className="text-3xl font-black text-foreground font-mono tracking-tighter">₹ 1.84 Cr</h3>
                                    <p className="text-xs text-muted-foreground font-medium">Addl. corpus for full recovery.</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border shadow-sm">
                            <CardContent className="p-8 flex items-center flex-col justify-center gap-4 text-center">
                                <div className="relative size-28">
                                    <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
                                        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="4" className="text-blue-600" strokeDasharray="64 100" strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-black text-foreground font-mono">64%</span>
                                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Adequate</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-black text-xs text-foreground uppercase tracking-tighter">Scenario Adequacy</p>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Stress Benchmarking</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="p-8 space-y-10 border-border">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <h4 className="text-lg font-black text-foreground uppercase tracking-tight">Financial Impact Timeline</h4>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Portfolio corpus trajectory under stress scenario.</p>
                            </div>
                            <div className="flex gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Current Plan</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Recommended</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-72 w-full relative">
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-8">
                                {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-full border-t border-border/50" />)}
                            </div>
                            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 300">
                                <path d="M0,50 L200,80 L400,150 L600,200 L1000,230" fill="none" stroke="currentColor" strokeWidth="4" className="text-blue-600" strokeLinecap="round" />
                                <path d="M0,50 L200,110 L400,280 L600,350" fill="none" stroke="currentColor" strokeWidth="4" className="text-red-500" strokeLinecap="round" />
                                <circle cx="400" cy="280" r="6" fill="#ef4444" stroke="white" strokeWidth="2" />
                                <line x1="400" y1="0" x2="400" y2="300" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" />
                            </svg>
                            <div className="flex justify-between pt-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                <span>Age 38</span>
                                <span>Age 45</span>
                                <span className="text-red-500">Shortfall (52)</span>
                                <span>Age 60</span>
                                <span>Age 75+</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-slate-950 text-white p-10 border-none relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <BrainCircuit className="w-48 h-48 text-blue-500" />
                        </div>
                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center gap-3">
                                <Zap className="w-6 h-6 text-blue-400" />
                                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">Actuarial Risk Narrative</h4>
                            </div>
                            <div className="max-w-4xl space-y-6">
                                <p className="text-lg font-medium text-slate-300 leading-relaxed italic">
                                    "Based on your current <span className="text-white font-bold">Critical Illness</span> coverage and the stress parameters defined, your portfolio faces a terminal shortfall at <span className="text-white font-bold underline decoration-red-500 underline-offset-8 uppercase">Age 52</span>. The depletion is primarily driven by the cumulative impact of treatment costs and loss of earning capacity over the recovery window."
                                </p>
                                <div className="flex items-center gap-2 text-blue-400">
                                    <TrendingDown className="w-4 h-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Recommended Strategic Shift:</p>
                                </div>
                                <p className="text-sm text-slate-400 font-mono uppercase tracking-wider leading-relaxed">
                                    Integrate a <span className="text-white font-bold italic">Cost-of-Living Rider</span> and increase core CI benefit by <span className="text-blue-400 font-bold tracking-widest">₹ 1.5 Cr</span>. This closes the funding gap through Age 75 and stabilizes the Adequacy Score at 94%.
                                </p>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <Button className="bg-blue-600 hover:bg-blue-700 font-black px-10 py-6 uppercase tracking-widest text-[10px]">Apply Fix</Button>
                                <Button variant="outline" className="border-white/20 hover:bg-white/10 text-white font-black px-10 py-6 uppercase tracking-widest text-[10px]">Print Analysis</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </main>

            {/* Sticky Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border px-10 py-4 flex justify-between items-center z-50">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Model Verified</span>
                    </div>
                    <div className="h-4 w-px bg-muted" />
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">Simulation ID: SM-9912-BETA</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="font-black h-10 px-8 uppercase tracking-widest text-[10px]">Compare Variants</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 font-black h-10 px-8 uppercase tracking-widest text-[10px] text-white">Generate Quote</Button>
                </div>
            </footer>
        </div>
    );
};
