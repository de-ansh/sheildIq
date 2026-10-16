import React, { useState, useEffect } from 'react';
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
    BookmarkPlus,
    CheckCircle2
} from "lucide-react";
import { ShieldIQApi, HLVResult } from '@/lib/api';
import { useApp } from '@/lib/AppContext';
import { formatINR } from '@/lib/utils';
import { ExplainResult } from '@/components/ExplainResult';

const RETIREMENT_AGE = 60;
const EDUCATION_PER_CHILD = 2500000;

export const LifeCalculatorView: React.FC = () => {
    const { user, setCurrentScreen } = useApp();

    // Seeded from the user's profile; every input stays editable for what-if analysis.
    const existingCoverTotal = user.existingLifeCover;
    const children = user.maritalStatus === 'Married' ? Math.max(0, user.dependents - 1) : user.dependents;
    const [income, setIncome] = useState(user.income || 1200000);
    const [years, setYears] = useState(Math.max(1, RETIREMENT_AGE - user.age));
    const [inflation, setInflation] = useState(6.0);
    const [liabilities, setLiabilities] = useState(user.homeLoan + user.otherLoans);
    const [educationFund, setEducationFund] = useState(children * EDUCATION_PER_CHILD);
    const [hlv, setHlv] = useState<HLVResult | null>(null);
    const [calcError, setCalcError] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const incomeMax = Math.max(10000000, income);

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            const res = await ShieldIQApi.calculateHLV({ income, years, inflation, existingCover: existingCoverTotal });
            if (cancelled) return;
            if (res && res.success && res.data) {
                setHlv(res.data);
                setCalcError(null);
            } else {
                setCalcError(res?.error || 'Cannot reach the calculation engine. Check your connection and try again.');
            }
        }, 150);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [income, years, inflation, existingCoverTotal]);

    // Same rule as the strategy engine: with nobody relying on this income and no debts, there is no income to replace.
    const needsIncomeReplacement = user.dependents > 0 || liabilities > 0;
    const incomeReplacement = hlv && needsIncomeReplacement ? hlv.recommendedCover : 0;
    const recommendedCover = hlv ? incomeReplacement + liabilities + educationFund : 0;
    const coverageGap = Math.max(0, recommendedCover - existingCoverTotal);
    const gapPercentage = recommendedCover > 0 ? Number(((coverageGap / recommendedCover) * 100).toFixed(1)) : 0;
    const assetsCoverPct = recommendedCover > 0 ? Math.min(100, Math.round((existingCoverTotal / recommendedCover) * 100)) : 0;

    // Projected gross income each year until retirement, plotted against today's income.
    const projection = Array.from({ length: years + 1 }, (_, t) => income * Math.pow(1 + inflation / 100, t));
    const peak = projection[projection.length - 1] || 1;
    const toPoint = (v: number, t: number) => `${(t / Math.max(1, years)) * 500},${150 - (v / peak) * 130}`;
    const incomePath = projection.map((v, t) => `${t === 0 ? 'M' : 'L'}${toPoint(v, t)}`).join(' ');

    const handleSavePlan = async () => {
        const res = await ShieldIQApi.createPlan({
            name: `Life cover ${formatINR(recommendedCover)} (${new Date().toLocaleDateString('en-IN')})`,
            category: 'Term Life',
            coverageAmount: recommendedCover,
            monthlyPremium: 0,
            status: coverageGap > 0 ? 'Gap Detected' : 'Adequate',
            description: `Income ${formatINR(income)} for ${years} years at ${inflation.toFixed(1)}% growth, liabilities ${formatINR(liabilities)}, education ${formatINR(educationFund)}. Existing cover ${formatINR(existingCoverTotal)}, gap ${formatINR(coverageGap)}.`,
        });
        setSaveMessage(res && res.success ? 'Saved to your plans.' : res?.error || 'Could not save the plan. Please try again.');
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 text-foreground font-sans">
            <header className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                    <span>Human Life Value Method</span>
                </div>
                <h1 className="text-4xl font-black tracking-tight text-foreground">Life Insurance Calculator</h1>
                <p className="text-muted-foreground text-lg max-w-2xl">
                    How much life cover your family needs: replace your income until retirement, clear your loans and fund your children's education.
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
                                <span className="text-blue-600 font-mono font-bold text-lg">{formatINR(income)}</span>
                            </div>
                            <Slider
                                value={[income]}
                                max={incomeMax}
                                min={100000}
                                step={50000}
                                onValueChange={(v: number[]) => setIncome(v[0])}
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                <span>₹1L</span>
                                <span>{formatINR(incomeMax)}</span>
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
                            <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                <span>1 Year</span>
                                <span>50 Years</span>
                            </div>
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
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 italic font-medium">Used as annual salary growth. The payout is discounted at an 8% return.</p>
                            </div>
                        </div>

                        {/* Secondary Inputs */}
                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
                            <div className="space-y-2">
                                <label htmlFor="liabilities-input" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Liabilities</label>
                                <Input
                                    id="liabilities-input"
                                    type="number"
                                    className="font-mono text-sm bg-muted/30"
                                    value={liabilities || ''}
                                    onChange={(e) => setLiabilities(Number(e.target.value) || 0)}
                                    placeholder="e.g. 4500000"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="education-fund-input" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Education Fund</label>
                                <Input
                                    id="education-fund-input"
                                    type="number"
                                    className="font-mono text-sm bg-muted/30"
                                    value={educationFund || ''}
                                    onChange={(e) => setEducationFund(Number(e.target.value) || 0)}
                                    placeholder="e.g. 2500000"
                                />
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
                                    <div className="text-5xl md:text-6xl font-black text-blue-600 tracking-tighter font-mono">
                                        {hlv ? formatINR(recommendedCover) : '—'}
                                    </div>
                                </div>
                                <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-none px-4 py-2 text-xs font-bold flex gap-2">
                                    <ShieldCheck className="w-4 h-4" />
                                    REAL-TIME ESTIMATE
                                </Badge>
                            </div>
                            <p className="mt-6 text-sm text-muted-foreground leading-relaxed font-medium">
                                Based on your {years}-year income trajectory adjusted for {inflation.toFixed(1)}% annual inflation and immediate liability payoff.
                            </p>
                            {calcError && (
                                <p role="alert" className="mt-3 text-sm font-medium text-red-600">{calcError}</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="p-8 space-y-8">
                        <h4 className="text-lg font-bold text-foreground">Income Continuity Graph</h4>

                        <div className="relative h-48 w-full border-b-2 border-border">
                            {/* SVG Chart */}
                            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none" role="img" aria-label={`Projected income rises from ${formatINR(income)} to ${formatINR(peak)} by retirement`}>
                                <path d={incomePath} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                                <path d={`M${toPoint(income, 0)} L${toPoint(income, years)}`} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" className="text-muted-foreground" vectorEffect="non-scaling-stroke" />
                            </svg>
                            <div className="absolute top-0 right-0 text-[10px] font-bold text-blue-600 font-mono">{formatINR(peak)}/yr</div>
                            <div className="absolute -bottom-6 left-0 text-[10px] font-bold text-muted-foreground uppercase">Today · {formatINR(income)}/yr</div>
                            <div className="absolute -bottom-6 right-0 text-[10px] font-bold text-muted-foreground uppercase">Retirement ({years}Y)</div>
                        </div>

                        <div className="space-y-6 pt-4">
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Coverage Gap Analysis</h4>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span>Total Target Coverage</span>
                                        <span className="font-mono font-black">{formatINR(recommendedCover)}</span>
                                    </div>
                                    <div className="h-4 w-full bg-blue-500/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600 w-full" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-muted-foreground">
                                        <span>Existing Life Cover</span>
                                        <span className="font-mono font-black text-foreground">{formatINR(existingCoverTotal)}</span>
                                    </div>
                                    <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 transition-all duration-300"
                                            style={{ width: `${assetsCoverPct}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            {coverageGap > 0 ? (
                                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                        <span className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-wider">
                                            {gapPercentage}% Coverage Gap Identified ({formatINR(coverageGap)})
                                        </span>
                                    </div>
                                </div>
                            ) : hlv && (
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-xl flex items-center gap-3">
                                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                        Existing cover meets this target
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="bg-muted/30 border-border p-8">
                        <div className="flex items-center gap-2 mb-6">
                            <BrainCircuit className="w-6 h-6 text-blue-600" />
                            <CardTitle className="text-lg font-bold">What Drives This Number</CardTitle>
                        </div>
                        <div className="space-y-6">
                            {[
                                {
                                    title: "Income Replacement",
                                    desc: !hlv
                                        ? 'Calculating income replacement…'
                                        : needsIncomeReplacement
                                            ? `${formatINR(incomeReplacement)} replaces the share of your income your family relies on for ${years} years, growing ${inflation.toFixed(1)}% a year. An increasing-cover term rider keeps pace with that growth.`
                                            : 'No one depends on your income and you have no loans, so no income replacement is needed. Add dependents in your profile if that changes.'
                                },
                                {
                                    title: "Liability Buffer",
                                    desc: liabilities > 0
                                        ? `${formatINR(liabilities)} of outstanding loans would fall on your family. Keep term cover at least until the loans are repaid.`
                                        : 'No outstanding loans are included in this estimate.'
                                },
                                {
                                    title: "Education Reserve",
                                    desc: educationFund > 0
                                        ? `${formatINR(educationFund)} is set aside for children's education at today's costs. Education inflation runs high, so review this every few years.`
                                        : 'No education fund is included in this estimate.'
                                }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <span className="text-blue-600 font-black pt-0.5">•</span>
                                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                        <strong className="text-foreground font-bold">{item.title}:</strong> {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6">
                            <ExplainResult
                                screen="life-calculator"
                                inputs={{ annualIncome: income, yearsToRetirement: years, salaryGrowthPct: inflation, liabilities, educationFund, existingLifeCover: existingCoverTotal }}
                                result={hlv ? { recommendedCover, incomeReplacement, coverageGap, gapPercentage } : null}
                            />
                        </div>
                    </Card>
                </div>
            </div>

            {saveMessage && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <div>
                            <p className="text-sm font-bold">{saveMessage}</p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSaveMessage(null)}
                        className="text-xs font-bold"
                    >
                        Dismiss
                    </Button>
                </div>
            )}

            {/* Action Footer */}
            <div className="bg-slate-900 dark:bg-blue-950 p-10 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-8 mt-12 shadow-2xl">
                <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tight">Ready to secure this coverage?</h3>
                    <p className="opacity-70 font-medium">Save this calculation to your plans, or compare policies that could close the gap.</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentScreen('comparison')}
                        className="flex-1 md:flex-none border-slate-700 bg-transparent text-white hover:bg-white hover:text-slate-900 h-14 px-8 font-bold"
                    >
                        <FileDown className="w-5 h-5 mr-2" />
                        Compare Policies
                    </Button>
                    <Button
                        onClick={handleSavePlan}
                        disabled={!hlv}
                        className="flex-1 md:flex-none bg-white text-slate-900 hover:bg-blue-50 h-14 px-8 font-bold group"
                    >
                        <BookmarkPlus className="w-5 h-5 mr-2" />
                        Save as Plan
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
