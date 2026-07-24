import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    AlertTriangle,
    Settings,
    ShieldCheck,
    BrainCircuit,
    Info,
    ArrowRight,
    FileDown,
    UserCheck
} from "lucide-react";

export const LifeCalculatorView: React.FC = () => {
    const [income, setIncome] = useState(125000);
    const [years, setYears] = useState(25);
    const [inflation, setInflation] = useState(6.0);

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 text-foreground">
            <header className="space-y-2">
                <h1 className="text-4xl font-black tracking-tight text-foreground">Life Insurance Calculator</h1>
                <p className="text-muted-foreground text-lg max-w-2xl">
                    Precision financial planning using ShieldIQ's proprietary continuity algorithm for your family's future security.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Input Panel */}
                <Card className="lg:col-span-5 border-border shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-2 pb-6 border-b border-border mb-6">
                        <Settings className="w-5 h-5 text-blue-600" />
                        <CardTitle className="text-xl font-bold">Financial Inputs</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-10">
                        {/* Income Slider */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-foreground">Annual Income (Gross)</label>
                                <span className="text-blue-600 font-mono font-bold text-lg">${income.toLocaleString()}</span>
                            </div>
                            <Slider
                                value={[income]}
                                max={500000}
                                min={20000}
                                step={5000}
                                onValueChange={(v: number[]) => setIncome(v[0])}
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                <span>$20k</span>
                                <span>$500k</span>
                            </div>
                        </div>

                        {/* Years Slider */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-foreground">Years to Retirement</label>
                                <span className="text-blue-600 font-mono font-bold text-lg">{years} Years</span>
                            </div>
                            <Slider
                                value={[years]}
                                max={50}
                                min={1}
                                step={1}
                                onValueChange={(v: number[]) => setYears(v[0])}
                            />
                        </div>

                        {/* Inflation Slider */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-foreground">Inflation Rate</label>
                                <span className="text-blue-600 font-mono font-bold text-lg">{inflation.toFixed(1)}%</span>
                            </div>
                            <Slider
                                value={[inflation]}
                                max={15}
                                min={0}
                                step={0.5}
                                onValueChange={(v: number[]) => setInflation(v[0])}
                            />
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-lg flex items-start gap-2">
                                <Info className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5" />
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 italic font-medium">Adjusted for current market volatility.</p>
                            </div>
                        </div>

                        {/* Secondary Inputs */}
                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Liabilities</label>
                                <Input className="font-mono text-sm bg-muted/30" defaultValue="450,000" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Education Fund</label>
                                <Input className="font-mono text-sm bg-muted/30" defaultValue="180,000" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results Panel */}
                <div className="lg:col-span-7 space-y-8">
                    <Card className="border-t-4 border-t-blue-600 shadow-md">
                        <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
                                <div className="space-y-1">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Required Coverage</h3>
                                    <div className="text-5xl md:text-6xl font-black text-blue-600 tracking-tighter font-mono">$2,845,000</div>
                                </div>
                                <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-none px-4 py-2 text-xs font-bold flex gap-2">
                                    <ShieldCheck className="w-4 h-4" />
                                    REAL-TIME ESTIMATE
                                </Badge>
                            </div>
                            <p className="mt-6 text-sm text-muted-foreground leading-relaxed font-medium">
                                Based on your {years}-year income trajectory adjusted for {inflation}% annual inflation and immediate liability payoff.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="p-8 space-y-8">
                        <h4 className="text-lg font-bold text-foreground">Income Continuity Graph</h4>

                        <div className="relative h-48 w-full border-b-2 border-border">
                            {/* SVG Chart */}
                            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 500 150">
                                <path d="M0,140 Q100,120 200,80 T500,20" fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
                                <circle cx="500" cy="20" fill="#2563eb" r="6" />
                                <path d="M0,140 Q100,135 200,120 T500,110" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" className="text-muted-foreground" />
                            </svg>
                            <div className="absolute -bottom-6 left-0 text-[10px] font-bold text-muted-foreground uppercase">Current</div>
                            <div className="absolute -bottom-6 right-0 text-[10px] font-bold text-muted-foreground uppercase">Retirement ({years}Y)</div>
                        </div>

                        <div className="space-y-6 pt-4">
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Coverage Gap Analysis</h4>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span>Total Target Coverage</span>
                                        <span className="font-mono font-black">$2.84M</span>
                                    </div>
                                    <div className="h-4 w-full bg-blue-500/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600 w-full" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-muted-foreground">
                                        <span>Current Savings & Assets</span>
                                        <span className="font-mono font-black text-foreground">$95K</span>
                                    </div>
                                    <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-muted-foreground w-[8%]" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                <span className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-wider">96.7% Coverage Gap Identified</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-muted/30 border-border p-8">
                        <div className="flex items-center gap-2 mb-6">
                            <BrainCircuit className="w-6 h-6 text-blue-600" />
                            <CardTitle className="text-lg font-bold">AI Precision Analysis</CardTitle>
                        </div>
                        <div className="space-y-6">
                            {[
                                { title: "Inflation Impact", desc: `The selected ${inflation}% rate significantly erodes purchasing power over ${years} years. A policy with a benefit adjustment rider is advised.` },
                                { title: "Liability Buffer", desc: "Your $450k mortgage represents the primary risk. Term coverage of at least 20 years is advised to bridge this gap." },
                                { title: "Education Reserve", desc: "The $180k allocation accounts for 4 years of tuition at today's rates. Indexing this is suggested." }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <span className="text-blue-600 font-black pt-0.5">•</span>
                                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                        <strong className="text-foreground font-bold">{item.title}:</strong> {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Action Footer */}
            <div className="bg-slate-900 dark:bg-blue-950 p-10 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-8 mt-12 shadow-2xl">
                <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tight">Ready to secure this coverage?</h3>
                    <p className="opacity-70 font-medium">Lock in your personalized rate based on these precision calculations.</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <Button variant="outline" className="flex-1 md:flex-none border-slate-700 bg-transparent text-white hover:bg-white hover:text-slate-900 h-14 px-8 font-bold">
                        <FileDown className="w-5 h-5 mr-2" />
                        Download PDF
                    </Button>
                    <Button className="flex-1 md:flex-none bg-white text-slate-900 hover:bg-blue-50 h-14 px-8 font-bold group">
                        <UserCheck className="w-5 h-5 mr-2" />
                        Connect with Advisor
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
