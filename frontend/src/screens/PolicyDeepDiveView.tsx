import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    CheckCircle2,
    XCircle,
    AlertCircle,
    ExternalLink,
    Download,
    Zap
} from "lucide-react";

export const PolicyDeepDiveView: React.FC = () => {
    return (
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 bg-background text-foreground">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <header className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-blue-200 dark:border-blue-800 text-blue-600 bg-blue-50 dark:bg-blue-900/20 font-bold uppercase tracking-widest text-[10px]">Active Policy Analysis</Badge>
                        <Badge className="bg-emerald-500 text-white border-none font-bold text-[10px] tracking-widest uppercase">Premium Clarity</Badge>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight">ICICI Pru iProtect Smart</h1>
                    <p className="text-muted-foreground font-medium">Policy ID: SH-8829-1029 • Term Life Insurance</p>
                </header>
                <div className="flex gap-3">
                    <Button variant="outline" className="h-12 px-6 font-bold">
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                    </Button>
                    <Button className="h-12 px-6 font-bold bg-blue-600 hover:bg-blue-700 text-white">
                        Compare Variants
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Quick Stats */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
                        {[
                            { label: 'Sum Assured', value: '₹ 2.50 Cr', color: 'text-blue-600' },
                            { label: 'Premium/Yr', value: '₹ 24,500', color: 'text-foreground' },
                            { label: 'Term Length', value: '35 Years', color: 'text-foreground' }
                        ].map((stat, i) => (
                            <Card key={i} className="shadow-sm">
                                <CardContent className="p-6">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                                    <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card className="p-8 shadow-sm">
                        <CardHeader className="p-0 mb-8 border-b border-border pb-6 flex flex-row justify-between items-center">
                            <CardTitle className="text-xl font-bold">Benefit Structural Analysis</CardTitle>
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Actuarial Verification</span>
                        </CardHeader>
                        <CardContent className="p-0 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h4 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Inclusions
                                    </h4>
                                    <ul className="space-y-4">
                                        {[
                                            'Death Benefit (Accelerated)',
                                            'Terminal Illness Waiver',
                                            'Permanent Disability Support',
                                            'Accidental Death (+₹50L)'
                                        ].map((item, i) => (
                                            <li key={i} className="flex gap-3 text-sm font-medium text-foreground/80">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <XCircle className="w-4 h-4 text-muted-foreground" />
                                        Exclusions
                                    </h4>
                                    <ul className="space-y-4">
                                        {[
                                            'Self-injury within 12 months',
                                            'Hazardous sporting accidents',
                                            'Pre-existing hidden conditions',
                                            'Military operations (War)'
                                        ].map((item, i) => (
                                            <li key={i} className="flex gap-3 text-sm font-medium text-muted-foreground italic opacity-80">
                                                <div className="w-1.5 h-1.5 rounded-full bg-muted mt-1.5 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl">
                                <h4 className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-[0.2em] mb-4">ShieldIQ Intelligence Insights</h4>
                                <div className="flex gap-4">
                                    <div className="bg-blue-600 p-2 rounded-xl h-fit">
                                        <Zap className="w-5 h-5 text-white" />
                                    </div>
                                    <p className="text-sm text-blue-900/70 dark:text-blue-200/60 leading-relaxed font-medium italic">
                                        "The accelerated terminal illness benefit effectively functions as a survival liquidity pool. We suggest utilizing the 'Life Stage' feature to increase cover without further medical staging."
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar - Risk Profile & Contact */}
                <div className="space-y-8">
                    <Card className="bg-primary text-primary-foreground p-8 border-none shadow-2xl">
                        <CardHeader className="p-0 mb-6">
                            <h3 className="text-xs font-black text-blue-400 dark:text-blue-300 uppercase tracking-[0.2em]">Compliance Score</h3>
                        </CardHeader>
                        <CardContent className="p-0 space-y-6">
                            <div className="flex items-center gap-6">
                                <div className="text-5xl font-black font-mono">94</div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-primary-foreground/70 uppercase">Tier: Institutional</p>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-3 h-1 bg-blue-600 rounded-full" />)}
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-primary-foreground/70 leading-relaxed font-mono">
                                Validated against 2024 IRDAI claim settlement ratio guidelines (99.07%).
                            </p>
                            <Button className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-bold h-12 uppercase tracking-widest text-[10px]">
                                Verify Metadata
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="p-8 space-y-6">
                        <h4 className="text-sm font-bold">Professional Reviewer</h4>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h5 className="text-sm font-bold">ShieldIQ Protocol</h5>
                                <p className="text-xs text-muted-foreground">Automated Audit System</p>
                            </div>
                        </div>
                        <div className="space-y-3 pt-2">
                            <p className="text-xs text-muted-foreground italic">"No critical gaps detected in the survival clause for this specific variant."</p>
                            <Button variant="ghost" className="w-full justify-start text-blue-600 text-xs font-bold p-0 h-auto hover:bg-transparent">
                                View Internal Audit Trails
                                <ExternalLink className="w-3 h-3 ml-2" />
                            </Button>
                        </div>
                    </Card>

                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 p-6 rounded-2xl flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase leading-relaxed font-mono">
                            Disclaimer: Analytical simulation only. Claims are subject to specific policy wordings and underwriting at the time of purchase.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
