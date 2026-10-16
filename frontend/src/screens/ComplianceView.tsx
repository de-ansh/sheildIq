import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Shield,
    FileText,
    AlertTriangle,
    Database,
    Gavel,
    CheckCircle2,
    Lock,
    Printer,
    Calendar,
    ArrowLeft
} from "lucide-react";
import { useApp } from '@/lib/AppContext';

export const ComplianceView: React.FC = () => {
    const { setCurrentScreen } = useApp();

    const [activeSection, setActiveSection] = useState('intro');
    const [hasAcknowledged, setHasAcknowledged] = useState(false);

    const sections = [
        { id: 'intro', title: '01 Introduction & Scope', icon: FileText },
        { id: 'sourcing', title: '02 Data Sourcing & Formulae', icon: Database },
        { id: 'limits', title: '03 Accuracy Limits & Variance', icon: AlertTriangle },
        { id: 'standards', title: '04 Data Protection & Security', icon: Shield },
        { id: 'liability', title: '05 Limitation of Liability', icon: Gavel },
        { id: 'law', title: '06 Governing Law & Jurisdiction', icon: Lock },
    ];

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 text-foreground font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-border">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                        <span>LEGAL & STATUTORY DISCLOSURE</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30 text-blue-600 bg-blue-50 dark:bg-blue-950/30">
                            Version 2.4.0
                        </Badge>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground">Disclaimer & Compliance Disclosure</h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Statutory boundaries, actuarial calculation disclaimers, and regulatory disclosures governing the ShieldIQ intelligence engine.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => window.print()}
                        className="font-bold border-border"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Print Document
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setCurrentScreen('dashboard')}
                        className="font-bold border-border"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Dashboard
                    </Button>
                </div>
            </div>

            {/* Document Metadata Bar */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Terms of Use & Methodology</span>
                </div>
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Effective: October 2026
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-500" /> Secure Document ID: #SX-9921-A
                    </span>
                </div>
            </div>

            {/* Main Content with Sticky TOC Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Table of Contents */}
                <aside className="lg:col-span-4 sticky top-24 space-y-4">
                    <Card className="border-border shadow-sm p-6 space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Table of Contents</h3>
                        <nav className="space-y-1">
                            {sections.map(s => {
                                const Icon = s.icon;
                                const isActive = activeSection === s.id;
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                            setActiveSection(s.id);
                                            const el = document.getElementById(s.id);
                                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${isActive
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" />
                                        <span>{s.title}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </Card>

                    <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 p-5 space-y-2">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Advisory Boundary Notice
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                            ShieldIQ is an algorithmic risk-assessment tool. It does not solicit, sell, or bind insurance policies. Licensed broker verification is recommended prior to policy execution.
                        </p>
                    </Card>
                </aside>

                {/* Statutory Sections Content */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Section 1 */}
                    <Card id="intro" className="border-border shadow-sm p-8 space-y-4">
                        <div className="flex items-center gap-2 text-blue-600 font-mono text-xs font-bold">
                            <span>SECTION 01</span>
                        </div>
                        <h2 className="text-2xl font-black text-foreground tracking-tight">Introduction & Platform Scope</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            ShieldIQ operates strictly as a high-integrity analytical data modeling and quantitative actuarial calculation platform. This document sets forth the operational boundaries, data processing protocols, and legal limits governing your utilization of our intelligence modules.
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            By accessing or interacting with ShieldIQ calculators, risk simulators, or policy comparisons, you acknowledge that all projected metrics (including Human Life Value, Funding Gaps, and Depletion Ages) are statistical simulations intended for personal financial planning and decision support only.
                        </p>
                    </Card>

                    {/* Section 2 */}
                    <Card id="sourcing" className="border-border shadow-sm p-8 space-y-4">
                        <div className="flex items-center gap-2 text-blue-600 font-mono text-xs font-bold">
                            <span>SECTION 02</span>
                        </div>
                        <h2 className="text-2xl font-black text-foreground tracking-tight">Actuarial Data Sourcing & Formulae</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Calculations use transparent, rule-based formulas applied to the information you provide. They do not use mortality tables or medical underwriting. Premium figures are indicative market averages, and policy data in the catalog is illustrative.</p>
                        <ul className="space-y-2 text-xs text-muted-foreground font-mono bg-muted/30 p-4 rounded-xl border border-border">
                            <li>• Discounting: future income is discounted at a nominal 8% return on the insurance payout</li>
                            <li>• Human Life Value: Σ(t=1..N) [ Income × 0.70 × (1+g)^t / 1.08^t ], N = years to age 60, g = salary growth</li>
                            <li>• Medical Inflation Vector: Baseline CPI + 300bps medical escalation spread</li>
                            <li>• Life need = Human Life Value + outstanding loans + ₹25L education per child; health need by city tier and family size</li>
                        </ul>
                    </Card>

                    {/* Section 3 */}
                    <Card id="limits" className="border-border shadow-sm p-8 space-y-4">
                        <div className="flex items-center gap-2 text-blue-600 font-mono text-xs font-bold">
                            <span>SECTION 03</span>
                        </div>
                        <h2 className="text-2xl font-black text-foreground tracking-tight">Accuracy Limits & Statistical Deviation</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Results depend on the assumptions shown on each screen; economic variables (market volatility, unexpected legislative changes, individual health underwriting classifications) can result in variances.
                        </p>
                        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-1 text-xs">
                            <span className="font-bold text-foreground">Underwriting Caveat:</span>
                            <p className="text-muted-foreground">
                                Insurance underwriters maintain autonomous discretion over final premium ratings, medical exclusions, co-payment terms, and waiting periods based on individualized medical examinations.
                            </p>
                        </div>
                    </Card>

                    {/* Section 4 */}
                    <Card id="standards" className="border-border shadow-sm p-8 space-y-4">
                        <div className="flex items-center gap-2 text-blue-600 font-mono text-xs font-bold">
                            <span>SECTION 04</span>
                        </div>
                        <h2 className="text-2xl font-black text-foreground tracking-tight">Data Protection & Security</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            How ShieldIQ protects your data. ShieldIQ does not currently hold any third-party security certification.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                            <div className="p-4 rounded-xl border border-border bg-card text-center space-y-1">
                                <span className="font-black text-foreground text-sm">Your Data</span>
                                <p className="text-[10px] text-muted-foreground">Used only to compute your strategy and never sold.</p>
                            </div>
                            <div className="p-4 rounded-xl border border-border bg-card text-center space-y-1">
                                <span className="font-black text-foreground text-sm">AI Strategy</span>
                                <p className="text-[10px] text-muted-foreground">Only anonymised figures are sent to the AI provider, with provider-side storage disabled.</p>
                            </div>
                            <div className="p-4 rounded-xl border border-border bg-card text-center space-y-1">
                                <span className="font-black text-foreground text-sm">Account Security</span>
                                <p className="text-[10px] text-muted-foreground">Passwords hashed with scrypt; sessions in httpOnly, same-site cookies.</p>
                            </div>
                        </div>
                    </Card>

                    {/* Section 5 & 6 */}
                    <Card id="liability" className="border-border shadow-sm p-8 space-y-4">
                        <div className="flex items-center gap-2 text-blue-600 font-mono text-xs font-bold">
                            <span>SECTION 05 & 06</span>
                        </div>
                        <h2 className="text-2xl font-black text-foreground tracking-tight">Limitation of Liability & Jurisdiction</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            In no circumstance shall ShieldIQ Technologies, its officers, or actuarial data contributors be held liable for direct, incidental, or consequential damages arising from reliance on algorithmic portfolio assessments.
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Any disputes arising hereunder shall be resolved through binding arbitration in accordance with accredited international commercial arbitration protocols.
                        </p>
                    </Card>

                    {/* Acknowledgement Card */}
                    <Card className="border-2 border-blue-500/30 bg-card p-8 space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-foreground">You have reached the end of the document.</h3>
                                <p className="text-xs text-muted-foreground">
                                    Please confirm that you have reviewed the statutory disclosure and understand the analytical boundaries of the ShieldIQ platform.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-muted-foreground">
                                    Status: {hasAcknowledged ? (
                                        <span className="text-emerald-500 font-black">Acknowledged</span>
                                    ) : (
                                        <span className="text-amber-500 font-black">Pending Acknowledgement</span>
                                    )}
                                </span>
                            </div>

                            <Button
                                onClick={() => setHasAcknowledged(true)}
                                disabled={hasAcknowledged}
                                className={`font-bold px-8 ${hasAcknowledged ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                            >
                                {hasAcknowledged ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Terms Accepted
                                    </>
                                ) : (
                                    'Acknowledge & Accept Terms'
                                )}
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
