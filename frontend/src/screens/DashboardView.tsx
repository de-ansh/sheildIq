import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    LayoutDashboard,
    PieChart,
    FileText,
    Settings,
    ShieldCheck,
    ArrowRight,
    BrainCircuit,
    ShieldAlert,
    ArrowRightLeft,
    Activity,
    Hospital,
    TrendingUp,
    AlertTriangle,
    ChevronRight,
    LogOut
} from "lucide-react";

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analysis', label: 'Coverage Analysis', icon: ShieldAlert },
    { id: 'comparison', label: 'Policy Compare', icon: ArrowRightLeft },
    { id: 'simulator', label: 'Risk Simulator', icon: Activity },
    { id: 'calculator', label: 'Life Calculator', icon: PieChart },
    { id: 'healthplanner', label: 'Health Planner', icon: Hospital },
    { id: 'reports', label: 'My Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
];

export const DashboardView: React.FC = () => {
    return (
        <div className="flex h-screen bg-background font-sans">
            {/* Sidebar */}
            <aside className="w-72 border-r border-border flex flex-col p-6 bg-muted/30">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/20">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h1 className="text-xl font-black text-foreground tracking-tight">ShieldIQ <span className="text-blue-600 text-[10px] align-top">PRO</span></h1>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all ${item.id === 'dashboard'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800 space-y-2">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Actuarial Guard</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">AI engine is currently monitoring your risk profile in real-time.</p>
                    </div>

                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted border-2 border-background shadow-sm" />
                            <div>
                                <p className="text-sm font-black text-foreground leading-none">James Harrison</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Premium Member</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500">
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-12 space-y-8">
                <header className="flex justify-between items-end">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-foreground tracking-tight uppercase">Analytical Dashboard</h2>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Real-time clarity on your coverage and risk exposure.</p>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" className="font-bold border-slate-200 dark:border-slate-800">
                            <FileText className="w-4 h-4 mr-2" /> Download Full Digest
                        </Button>
                        <Button className="font-bold bg-blue-600 hover:bg-blue-700">
                            New Risk Audit
                        </Button>
                    </div>
                </header>

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-slate-100 dark:border-slate-800 shadow-sm">
                        <CardHeader className="p-6 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Income Replacement</span>
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <div className="text-3xl font-black text-foreground font-mono tracking-tighter">₹ 4.5 Cr</div>
                            <CardDescription className="text-[10px] text-muted-foreground font-bold uppercase mt-2">Target cover recommended</CardDescription>
                        </CardContent>
                    </Card>

                    <Card className="border-border shadow-sm">
                        <CardHeader className="p-6 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Coverage Gap</span>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <div className="text-3xl font-black text-foreground font-mono tracking-tighter">₹ 1.2 Cr</div>
                            <CardDescription className="text-[10px] text-muted-foreground font-bold uppercase mt-2">Current unsecured exposure</CardDescription>
                        </CardContent>
                    </Card>

                    <Card className="border-border shadow-sm">
                        <CardHeader className="p-6 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Health Risk Tier</span>
                            <Badge className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-none font-black text-[9px] uppercase tracking-widest">Low Risk</Badge>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <div className="text-3xl font-black text-foreground font-mono tracking-tighter">STABLE</div>
                            <CardDescription className="text-[10px] text-muted-foreground font-bold uppercase mt-2">Based on current logs</CardDescription>
                        </CardContent>
                    </Card>

                    <Card className="border-border shadow-sm">
                        <CardHeader className="p-6 pb-0 flex flex-row items-center justify-between space-y-0">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Risk Adequacy</span>
                            <span className="text-amber-500 font-black font-mono">65/100</span>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 w-[65%]" />
                            </div>
                            <CardDescription className="text-[10px] text-muted-foreground font-bold uppercase mt-2">Benchmark: 85 (High)</CardDescription>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 border-border shadow-xl min-h-[460px] flex flex-col">
                        <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-lg font-black text-foreground uppercase tracking-tight">Protection Strategy Overview</CardTitle>
                            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-blue-600">Full analysis <ArrowRight className="w-3 h-3 ml-2" /></Button>
                        </CardHeader>
                        <CardContent className="flex-1 p-8 pt-4 flex flex-col">
                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl bg-muted/30">
                                <Activity className="w-12 h-12 text-muted-foreground/30 mb-4" />
                                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Visualizing Income vs Coverage Projection</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card className="bg-slate-950 text-white p-8 border-none relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <BrainCircuit className="w-24 h-24 text-blue-500" />
                            </div>
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center gap-2 text-blue-400">
                                    <Activity className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">AI Risk Audit</span>
                                </div>
                                <p className="text-sm font-medium text-slate-300 leading-relaxed italic">
                                    "Current term coverage is efficient for immediate debt obligations but lacks 14 years of income nodes for dependent education."
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 transition-colors hover:border-blue-500/30">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Increase life cover by <span className="text-white font-bold">25%</span> for projected inflation.</p>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 transition-colors hover:border-emerald-500/30">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Medical floaters are highly optimized for Tier 1 networks.</p>
                                    </div>
                                </div>
                                <Button className="w-full bg-white text-slate-950 hover:bg-slate-100 font-bold py-6 group">
                                    Optimize Strategically <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </Card>

                        <Card className="p-8 border-border shadow-sm space-y-6">
                            <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Urgent Nodes</h5>
                            <div className="space-y-2">
                                {[
                                    'Update Dependent Liability Matrix',
                                    'Verify Corporate Group Benefits',
                                    'Calibrate Annual Inflation Peg'
                                ].map((action, i) => (
                                    <button key={i} className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent transition-all text-left group">
                                        <span className="text-[11px] font-bold text-foreground/80 group-hover:text-blue-600 transition-colors">{action}</span>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
                                    </button>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>

                <footer className="pt-12 text-center">
                    <p className="text-[9px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.4em] leading-relaxed max-w-lg mx-auto italic">
                        ShieldIQ Platform • Analytical Intelligence for Human Risk Management • © 2024
                    </p>
                </footer>
            </main>
        </div>
    );
};
