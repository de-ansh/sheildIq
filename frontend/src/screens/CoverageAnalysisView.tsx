import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Info,
    Brain,
    Download,
    Activity,
    ShieldAlert
} from "lucide-react";

export const CoverageAnalysisView: React.FC = () => {
    return (
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-10 font-sans bg-background text-foreground">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <header className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-blue-200 dark:border-blue-800 text-blue-600 bg-blue-50 dark:bg-blue-900/20 font-black uppercase tracking-widest text-[10px] px-3">Advanced Risk Audit</Badge>
                        <Badge className="bg-amber-500 text-white border-none font-black text-[10px] tracking-widest uppercase px-3">High Priority</Badge>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight">Coverage Gap & Affordability</h1>
                    <p className="text-muted-foreground font-medium max-w-2xl text-lg">
                        Actuarial synthesis of your global protection status and multi-decade financial sustainability.
                    </p>
                </header>
                <div className="flex gap-3">
                    <Button variant="outline" className="h-12 px-6 font-bold">
                        <Download className="w-4 h-4 mr-2" /> Export Audit
                    </Button>
                    <Button className="h-12 px-6 font-bold bg-blue-600 hover:bg-blue-700 text-white">
                        Apply All Optimizations
                    </Button>
                </div>
            </div>

            {/* Global Status Bar */}
            <Card className="border-border shadow-2xl bg-card overflow-hidden relative">
                <CardHeader className="p-0">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Activity className="w-40 h-40 text-blue-500" />
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8 relative z-10">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">Global Protection Standing</h3>
                            <p className="text-sm font-medium text-muted-foreground">Aggregate across Life, Health, and Assets</p>
                        </div>
                        <div className="text-right flex items-baseline gap-2">
                            <span className="text-5xl font-black text-blue-600 font-mono">72%</span>
                            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">/ Target</span>
                        </div>
                    </div>
                    <div className="relative h-12 w-full bg-muted rounded-full overflow-hidden border border-border">
                        <div className="absolute inset-y-0 left-0 bg-blue-600 flex items-center justify-center text-[10px] font-black text-white px-6 uppercase tracking-widest transition-all duration-1000" style={{ width: '72%' }}>Current Coverage</div>
                        <div className="absolute inset-y-0 right-0 flex items-center justify-center text-[10px] font-black text-muted-foreground uppercase tracking-widest" style={{ width: '28%' }}>Shortfall</div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { label: "Life Protection", val: 85, color: "bg-blue-600" },
                            { label: "Health Depth", val: 92, color: "bg-blue-600" },
                            { label: "Liability Shield", val: 45, color: "bg-amber-500" },
                            { label: "Critical Assets", val: 78, color: "bg-blue-600" }
                        ].map((cat, i) => (
                            <div key={i} className="space-y-3">
                                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                                    <span>{cat.label}</span>
                                    <span className={cat.val < 50 ? "text-amber-500" : "text-foreground"}>{cat.val}%</span>
                                </div>
                                <Progress value={cat.val} className={`h-1.5 ${cat.val < 50 ? "bg-amber-500/10" : ""}`} />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Waterfall Chart Card */}
                    <Card className="border-border">
                        <CardHeader className="p-8 pb-3">
                            <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border border-border">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl font-black uppercase tracking-tight">Life Gap Waterfall</CardTitle>
                                    <CardDescription className="text-xs font-bold uppercase tracking-widest">Unpacking income replacement and fixed debt obligations.</CardDescription>
                                </div>
                                <Badge className="bg-primary text-primary-foreground font-black">₹ 3.5 Cr Gap</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 pt-0">
                            <div className="h-64 flex items-end justify-between px-4 pb-8 border-b border-border/50">
                                {[
                                    { label: "Goal", h: "100%", color: "bg-blue-100/50 dark:bg-blue-900/10 border-t-2 border-blue-600" },
                                    { label: "Existing", h: "65%", color: "bg-blue-600" },
                                    { label: "Mortgage", h: "20%", color: "bg-amber-400/60", offset: "65%" },
                                    { label: "Education", h: "15%", color: "bg-amber-400/40", offset: "85%" }
                                ].map((bar, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-4 group h-full justify-end">
                                        <div className={`w-16 rounded-t-sm transition-all duration-700 ${bar.color}`} style={{ height: bar.h, marginBottom: bar.offset || 0 }} />
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest group-hover:text-blue-600 transition-colors">{bar.label}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Affordability & Sustainability */}
                    <Card className="p-8 space-y-8">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-foreground tracking-tight uppercase">Affordability Dynamics</h3>
                                <p className="text-sm text-muted-foreground font-medium">Monthly cashflow allocation for premiums.</p>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 px-4 py-2 rounded-xl flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Sustainability: High</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: "Fit Score", val: "84", desc: "/ 100", color: "text-blue-600" },
                                { label: "Monthly Surplus", val: "₹ 1.2L", desc: "Post Prem", color: "text-foreground" },
                                { label: "Prem Ratio", val: "14.2%", desc: "Target < 20%", color: "text-amber-500" }
                            ].map((stat, i) => (
                                <div key={i} className="p-6 bg-muted/30 border border-border rounded-2xl space-y-1">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-2xl font-black font-mono ${stat.color}`}>{stat.val}</span>
                                        <span className="text-[10px] font-bold text-muted-foreground">{stat.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                    <span>Premium Escalation Projection (20Y)</span>
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <div className="h-32 w-full relative group">
                                    <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 1000 100">
                                        <path d="M0,100 Q200,80 500,50 T1000,0" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600" />
                                        <path d="M0,100 Q200,90 500,80 T1000,70" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-300 dark:text-slate-700" strokeDasharray="4 4" />
                                    </svg>
                                    <div className="flex justify-between pt-2 text-[9px] font-mono text-slate-400 uppercase font-bold">
                                        <span>Year 0</span>
                                        <span>Year 10</span>
                                        <span>Year 20</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Sidebar Diagnostics */}
                <div className="space-y-8">
                    <Card className="p-8 border-none bg-slate-950 text-white space-y-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Brain className="w-32 h-32 text-blue-500" />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.3em]">AI Risk Diagnostic</h3>
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black uppercase text-blue-400">Critical Insight</p>
                                            <p className="text-sm font-bold">Liability Overexposure</p>
                                        </div>
                                        <ShieldAlert className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic border-l-2 border-blue-500/30 pl-4">
                                        "Your total liability exposure exceeds your liquid assets by 35%. Recommendation: Increase Umbrella Policy by ₹ 1.5 Cr."
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-xl">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black uppercase text-slate-400">Efficiency Alert</p>
                                            <p className="text-sm font-bold">Asset Redundancy</p>
                                        </div>
                                        <AlertTriangle className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic border-l-2 border-white/10 pl-4">
                                        "Overlapping property coverage detected on 2 policies. Potential annual optimization: ₹ 42,000."
                                    </p>
                                </div>
                            </div>

                            <Button className="w-full bg-blue-600 hover:bg-blue-700 py-6 font-black uppercase tracking-widest text-[10px]">
                                Deploy All Recommendations
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-8 space-y-6 border-border">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Actuarial Parameters</h4>
                        <div className="space-y-4">
                            {[
                                { label: "MCPI Index", val: "3.8%", icon: TrendingUp },
                                { label: "Claims Conv.", val: "99.1%", icon: CheckCircle2 },
                                { label: "Risk Coefficient", val: "Alpha-7", icon: Activity }
                            ].map((param, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                                    <div className="flex items-center gap-3">
                                        <param.icon className="w-3.3 h-3.5 text-muted-foreground" />
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{param.label}</span>
                                    </div>
                                    <span className="text-[10px] font-black font-mono text-foreground uppercase tracking-widest">{param.val}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-6 rounded-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <Info className="w-5 h-5 text-blue-600" />
                            <p className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-[0.2em]">Next-Gen Simulation</p>
                        </div>
                        <p className="text-xs text-blue-900/60 dark:text-blue-200/50 leading-relaxed font-medium font-mono text-[10px] uppercase">
                            Computed via ShieldIQ-9 Proprietary Neural Engine. Last re-run: Oct 24, 09:42 AM.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
