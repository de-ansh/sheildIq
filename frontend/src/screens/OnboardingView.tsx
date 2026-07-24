import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Shield,
    ArrowRight,
    ArrowLeft,
    Calendar,
    MapPin,
    Briefcase,
    Lock
} from "lucide-react";

export const OnboardingView: React.FC = () => {
    const [step, setStep] = useState(1);
    const totalSteps = 3;
    const progress = (step / totalSteps) * 100;

    const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            {/* Header */}
            <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-foreground">ShieldIQ</span>
                </div>
                <Button variant="ghost" className="text-muted-foreground font-bold text-sm">Save & Exit</Button>
            </header>

            <main className="flex-grow flex flex-col items-center py-12 px-4 max-w-4xl mx-auto w-full">
                {/* Progress Tracker */}
                <div className="w-full max-w-[600px] mb-12 space-y-4">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Step {step} of 3</p>
                            <h2 className="text-lg font-bold text-foreground">
                                {step === 1 && "Personal Information"}
                                {step === 2 && "Family & Liabilities"}
                                {step === 3 && "Protection & Lifestyle"}
                            </h2>
                        </div>
                        <p className="text-sm font-black text-muted-foreground font-mono">{Math.round(progress)}%</p>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                {/* Step Content */}
                <Card className="w-full max-w-[650px] border-border bg-card shadow-xl p-8 md:p-12">
                    <CardContent className="p-0 space-y-8">
                        {step === 1 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="text-center space-y-2">
                                    <h1 className="text-3xl font-black text-foreground tracking-tight">Personal Profile</h1>
                                    <p className="text-muted-foreground font-medium">This helps us initialize your actuarial risk baseline.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="font-bold text-foreground">Current Age</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input placeholder="e.g. 32" className="pl-12 py-6 bg-muted/30" type="number" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-foreground">Annual Gross Income (INR)</Label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">₹</span>
                                            <Input placeholder="Enter amount" className="pl-12 py-6 bg-muted/30" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-foreground">Primary Resident City</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <select className="flex h-12 w-full rounded-md border border-input bg-muted/30 px-12 py-2 text-base shadow-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring appearance-none">
                                                <option value="">Select city category</option>
                                                <option>Tier 1 (Metro)</option>
                                                <option>Tier 2 (Emerging Metro)</option>
                                                <option>Tier 3 (Urban Center)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-foreground">Occupation</Label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input placeholder="e.g. Product Designer" className="pl-12 py-6 bg-muted/30" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center space-y-2">
                                    <h1 className="text-3xl font-black text-foreground tracking-tight">Family & Debt</h1>
                                    <p className="text-muted-foreground font-medium">Understand your financial continuity requirements.</p>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <Label className="font-bold text-foreground">Immediate Dependents</Label>
                                        <div className="grid grid-cols-4 gap-3">
                                            {[0, 1, 2, "3+"].map(num => (
                                                <Button key={num} variant="outline" className="py-8 font-bold text-lg dark:hover:bg-slate-800">
                                                    {num}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-border">
                                        <Label className="font-bold text-foreground">Total Outstanding Liabilities</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Home Loan</Label>
                                                <Input placeholder="₹ 0.00" className="bg-muted/30 font-mono" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Other Loans</Label>
                                                <Input placeholder="₹ 0.00" className="bg-muted/30 font-mono" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-foreground">Monthly Expenses (Lifestyle)</Label>
                                        <Input placeholder="₹ Enter average amount" className="py-6 bg-muted/30 font-mono" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center space-y-2">
                                    <h1 className="text-3xl font-black text-foreground tracking-tight">Final Assessment</h1>
                                    <p className="text-muted-foreground font-medium">Lifestyle and existing coverage verification.</p>
                                </div>

                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="font-bold text-foreground">Existing Life Cover</Label>
                                            <Input placeholder="₹ Total Sum Assured" className="bg-muted/30 font-mono" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-bold text-foreground">Existing Health Cover</Label>
                                            <Input placeholder="₹ Floater/Individual" className="bg-muted/30 font-mono" />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-border">
                                        <Label className="font-bold text-foreground">Employer Benefits</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {["Group Term Life", "Critical Illness", "Accident Cover", "OPD Benefits"].map(benefit => (
                                                <div key={benefit} className="flex items-center gap-3 p-4 border border-border rounded-xl hover:bg-muted/30 cursor-pointer transition-colors group">
                                                    <Checkbox id={benefit} />
                                                    <Label htmlFor={benefit} className="font-bold text-sm text-muted-foreground group-hover:text-blue-600 transition-colors">{benefit}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="font-bold text-foreground">Lifestyle Risk Indicators</Label>
                                        <div className="flex flex-wrap gap-4">
                                            {["Tobacco/Smoking", "High-Risk Hobbies", "Frequent Int'l Travel"].map(risk => (
                                                <div key={risk} className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-full border border-border">
                                                    <Checkbox id={risk} />
                                                    <span className="text-xs font-bold text-muted-foreground">{risk}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation buttons */}
                        <div className="flex flex-col gap-4 pt-8 border-t border-border">
                            <div className="flex items-center justify-between gap-4">
                                {step > 1 ? (
                                    <Button variant="ghost" className="flex-1 py-7 font-bold text-muted-foreground hover:text-blue-600" onClick={prevStep}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                ) : <div className="flex-1" />}

                                <Button className="flex-2 py-7 px-10 bg-blue-600 hover:bg-blue-700 font-bold text-lg" onClick={step === 3 ? () => { } : nextStep}>
                                    {step === 3 ? "Generate Policy Gap" : "Continue"}
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-muted-foreground/50">
                                <Lock className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">End-to-end encrypted actuarial data</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer info */}
                <div className="mt-12 flex gap-8 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                    <a href="#" className="hover:text-blue-600">Privacy Policy</a>
                    <a href="#" className="hover:text-blue-600">Protocol Disclosures</a>
                    <a href="#" className="hover:text-blue-600">Compliance Audit</a>
                </div>
            </main>
        </div>
    );
};
