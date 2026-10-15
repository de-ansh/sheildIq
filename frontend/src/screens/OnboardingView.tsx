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
    Lock,
    Loader2
} from "lucide-react";
import { useApp } from '@/lib/AppContext';

export const OnboardingView: React.FC = () => {
    const { user, submitOnboarding, setCurrentScreen } = useApp();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const totalSteps = 3;
    const progress = (step / totalSteps) * 100;

    const [formData, setFormData] = useState({
        age: user?.age || 34,
        income: user?.income || 1450000,
        city: user?.city || 'Tier 1 (Metro)',
        occupation: user?.occupation || 'Senior Systems Architect',
        dependents: user?.dependents ?? 2,
        homeLoan: 4500000,
        otherLoans: 500000,
        monthlyExpenses: 85000,
        existingLifeCover: 10000000,
        existingHealthCover: 1000000,
        employerBenefits: ['Group Term Life', 'OPD Benefits'] as string[],
        lifestyleRisks: [] as string[],
    });

    const updateField = <K extends keyof typeof formData>(field: K, value: typeof formData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleBenefit = (benefit: string) => {
        setFormData(prev => {
            const exists = prev.employerBenefits.includes(benefit);
            return {
                ...prev,
                employerBenefits: exists
                    ? prev.employerBenefits.filter(b => b !== benefit)
                    : [...prev.employerBenefits, benefit],
            };
        });
    };

    const toggleRisk = (risk: string) => {
        setFormData(prev => {
            const exists = prev.lifestyleRisks.includes(risk);
            return {
                ...prev,
                lifestyleRisks: exists
                    ? prev.lifestyleRisks.filter(r => r !== risk)
                    : [...prev.lifestyleRisks, risk],
            };
        });
    };

    const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleComplete = async () => {
        setIsSubmitting(true);
        try {
            await submitOnboarding(formData);
            setCurrentScreen('dashboard');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveAndExit = async () => {
        setIsSubmitting(true);
        try {
            await submitOnboarding(formData);
            setCurrentScreen('dashboard');
        } finally {
            setIsSubmitting(false);
        }
    };

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
                <Button
                    variant="ghost"
                    onClick={handleSaveAndExit}
                    disabled={isSubmitting}
                    className="text-muted-foreground font-bold text-sm"
                >
                    Save & Exit
                </Button>
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
                                        <Label htmlFor="age-input" className="font-bold text-foreground">Current Age</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="age-input"
                                                type="number"
                                                min={18}
                                                max={100}
                                                value={formData.age || ''}
                                                onChange={(e) => updateField('age', Number(e.target.value))}
                                                placeholder="e.g. 32"
                                                className="pl-12 py-6 bg-muted/30"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="income-input" className="font-bold text-foreground">Annual Gross Income (INR)</Label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">₹</span>
                                            <Input
                                                id="income-input"
                                                type="number"
                                                value={formData.income || ''}
                                                onChange={(e) => updateField('income', Number(e.target.value))}
                                                placeholder="Enter amount"
                                                className="pl-12 py-6 bg-muted/30"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="city-select" className="font-bold text-foreground">Primary Resident City</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <select
                                                id="city-select"
                                                value={formData.city}
                                                onChange={(e) => updateField('city', e.target.value)}
                                                className="flex h-12 w-full rounded-md border border-input bg-muted/30 px-12 py-2 text-base shadow-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
                                            >
                                                <option value="">Select city category</option>
                                                <option value="Tier 1 (Metro)">Tier 1 (Metro)</option>
                                                <option value="Tier 2 (Emerging Metro)">Tier 2 (Emerging Metro)</option>
                                                <option value="Tier 3 (Urban Center)">Tier 3 (Urban Center)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="occupation-input" className="font-bold text-foreground">Occupation</Label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="occupation-input"
                                                value={formData.occupation}
                                                onChange={(e) => updateField('occupation', e.target.value)}
                                                placeholder="e.g. Product Designer"
                                                className="pl-12 py-6 bg-muted/30"
                                            />
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
                                            {[0, 1, 2, 3].map(num => (
                                                <Button
                                                    key={num}
                                                    type="button"
                                                    variant={formData.dependents === num ? "default" : "outline"}
                                                    className={`py-8 font-bold text-lg ${formData.dependents === num ? 'bg-blue-600 text-white' : 'dark:hover:bg-slate-800'}`}
                                                    onClick={() => updateField('dependents', num)}
                                                >
                                                    {num === 3 ? "3+" : num}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-border">
                                        <Label className="font-bold text-foreground">Total Outstanding Liabilities</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Home Loan</Label>
                                                <Input
                                                    type="number"
                                                    value={formData.homeLoan || ''}
                                                    onChange={(e) => updateField('homeLoan', Number(e.target.value))}
                                                    placeholder="₹ 0.00"
                                                    className="bg-muted/30 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Other Loans</Label>
                                                <Input
                                                    type="number"
                                                    value={formData.otherLoans || ''}
                                                    onChange={(e) => updateField('otherLoans', Number(e.target.value))}
                                                    placeholder="₹ 0.00"
                                                    className="bg-muted/30 font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-foreground">Monthly Expenses (Lifestyle)</Label>
                                        <Input
                                            type="number"
                                            value={formData.monthlyExpenses || ''}
                                            onChange={(e) => updateField('monthlyExpenses', Number(e.target.value))}
                                            placeholder="₹ Enter average amount"
                                            className="py-6 bg-muted/30 font-mono"
                                        />
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
                                            <Input
                                                type="number"
                                                value={formData.existingLifeCover || ''}
                                                onChange={(e) => updateField('existingLifeCover', Number(e.target.value))}
                                                placeholder="₹ Total Sum Assured"
                                                className="bg-muted/30 font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-bold text-foreground">Existing Health Cover</Label>
                                            <Input
                                                type="number"
                                                value={formData.existingHealthCover || ''}
                                                onChange={(e) => updateField('existingHealthCover', Number(e.target.value))}
                                                placeholder="₹ Floater/Individual"
                                                className="bg-muted/30 font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-border">
                                        <Label className="font-bold text-foreground">Employer Benefits</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {["Group Term Life", "Critical Illness", "Accident Cover", "OPD Benefits"].map(benefit => (
                                                <div
                                                    key={benefit}
                                                    onClick={() => toggleBenefit(benefit)}
                                                    className="flex items-center gap-3 p-4 border border-border rounded-xl hover:bg-muted/30 cursor-pointer transition-colors group"
                                                >
                                                    <Checkbox
                                                        id={benefit}
                                                        checked={formData.employerBenefits.includes(benefit)}
                                                        onCheckedChange={() => toggleBenefit(benefit)}
                                                    />
                                                    <Label htmlFor={benefit} className="font-bold text-sm text-muted-foreground group-hover:text-blue-600 transition-colors cursor-pointer">
                                                        {benefit}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="font-bold text-foreground">Lifestyle Risk Indicators</Label>
                                        <div className="flex flex-wrap gap-4">
                                            {["Tobacco/Smoking", "High-Risk Hobbies", "Frequent Int'l Travel"].map(risk => (
                                                <div
                                                    key={risk}
                                                    onClick={() => toggleRisk(risk)}
                                                    className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-full border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                                                >
                                                    <Checkbox
                                                        id={risk}
                                                        checked={formData.lifestyleRisks.includes(risk)}
                                                        onCheckedChange={() => toggleRisk(risk)}
                                                    />
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
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="flex-1 py-7 font-bold text-muted-foreground hover:text-blue-600"
                                        onClick={prevStep}
                                        disabled={isSubmitting}
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                ) : <div className="flex-1" />}

                                <Button
                                    type="button"
                                    disabled={isSubmitting}
                                    className="flex-2 py-7 px-10 bg-blue-600 hover:bg-blue-700 font-bold text-lg"
                                    onClick={step === 3 ? handleComplete : nextStep}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Saving...
                                        </span>
                                    ) : (
                                        <>
                                            {step === 3 ? "Generate Policy Gap" : "Continue"}
                                            <ArrowRight className="w-5 h-5 ml-2" />
                                        </>
                                    )}
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
