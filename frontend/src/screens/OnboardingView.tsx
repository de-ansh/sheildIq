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
import type { AiProfileDraft, CityTier } from '@/lib/api';
import { DescribeYourself } from '@/components/DescribeYourself';
import { householdOf, type DependentRelation } from '@/lib/household';

type DependentRow = { relation: DependentRelation; age: number | null };
const RELATION_LABEL: Record<DependentRelation, string> = { child: 'Child', parent: 'Parent', sibling: 'Sibling' };
const MAX_DEPENDENTS = 12;

export const OnboardingView: React.FC = () => {
    const { user, submitOnboarding, setCurrentScreen } = useApp();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const totalSteps = 3;
    const progress = (step / totalSteps) * 100;

    // Prefilled from the saved profile, so re-running onboarding edits rather than overwrites.
    const [formData, setFormData] = useState({
        age: user.age,
        income: user.income,
        cityTier: user.cityTier as CityTier | '',
        occupation: user.occupation,
        maritalStatus: user.maritalStatus,
        dependents: user.dependents,
        homeLoan: user.homeLoan,
        otherLoans: user.otherLoans,
        monthlyExpenses: user.monthlyExpenses,
        existingLifeCover: user.existingLifeCover,
        existingHealthCover: user.existingHealthCover,
        liquidSavings: user.liquidSavings,
        spouseIncome: user.spouseIncome,
        // Older profiles only stored a count: pre-fill their children (ages blank) so editing never drops them.
        dependentDetails: (user.dependentDetails.length > 0
            ? user.dependentDetails
            : householdOf(user).children.map(() => ({ relation: 'child' as const, age: null }))) as DependentRow[],
        parentsHealthCover: user.parentsHealthCover,
        loanEmi: user.loanEmi,
        homeLoanYearsLeft: user.homeLoanYearsLeft,
        existingCiCover: user.existingCiCover,
        existingPaCover: user.existingPaCover,
        employerBenefits: user.employerBenefits,
        lifestyleRisks: user.lifestyleRisks,
    });
    const [stepError, setStepError] = useState<string | null>(null);

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

    // Returns an error for the first step whose required answers are missing, checking steps 1..upTo.
    const validate = (upTo: number): { step: number; error: string } | null => {
        const { age, income, cityTier, monthlyExpenses } = formData;
        if (!Number.isInteger(age) || age < 18 || age > 100) return { step: 1, error: 'Enter your age (18–100).' };
        if (!(income > 0)) return { step: 1, error: 'Enter your annual gross income.' };
        if (!cityTier) return { step: 1, error: 'Select your city category.' };
        if (upTo >= 2 && !(monthlyExpenses > 0)) return { step: 2, error: 'Enter your monthly household expenses.' };
        const amounts = [formData.homeLoan, formData.otherLoans, formData.existingLifeCover, formData.existingHealthCover, formData.liquidSavings, formData.spouseIncome, formData.parentsHealthCover, formData.loanEmi, formData.existingCiCover, formData.existingPaCover];
        if (upTo >= 2 && amounts.some(v => !(v >= 0))) return { step: 2, error: 'Amounts cannot be negative.' };
        if (upTo >= 2 && !(Number.isInteger(formData.homeLoanYearsLeft) && formData.homeLoanYearsLeft >= 0 && formData.homeLoanYearsLeft <= 40)) {
            return { step: 2, error: 'Enter the years left on your home loan (0–40).' };
        }
        if (upTo >= 2 && formData.dependentDetails.some(d => d.age === null || !Number.isInteger(d.age) || d.age < 0 || d.age > 110)) {
            return { step: 2, error: "Enter each dependent's age (0–110)." };
        }
        return null;
    };

    // Only fields the AI actually found are applied; everything stays editable before saving.
    const applyDraft = (draft: AiProfileDraft) => {
        const lists = ['notes', 'employerBenefits', 'lifestyleRisks', 'dependentDetails', 'dependents'];
        const found = Object.entries(draft).filter(([key, value]) => value !== null && !lists.includes(key));
        setFormData(prev => ({
            ...prev,
            ...Object.fromEntries(found),
            employerBenefits: draft.employerBenefits.length ? draft.employerBenefits : prev.employerBenefits,
            lifestyleRisks: draft.lifestyleRisks.length ? draft.lifestyleRisks : prev.lifestyleRisks,
            dependentDetails: draft.dependentDetails.length ? draft.dependentDetails : prev.dependentDetails,
        }));
        setStepError(null);
    };

    const nextStep = () => {
        const problem = validate(step);
        setStepError(problem?.error ?? null);
        if (!problem) setStep(s => Math.min(s + 1, totalSteps));
    };
    const prevStep = () => {
        setStepError(null);
        setStep(s => Math.max(s - 1, 1));
    };

    const handleComplete = async () => {
        const problem = validate(totalSteps);
        if (problem) {
            setStep(problem.step);
            setStepError(problem.error);
            return;
        }
        setIsSubmitting(true);
        try {
            const dependentDetails = formData.dependentDetails.map(d => ({ relation: d.relation, age: d.age as number }));
            const spouseDependent = formData.maritalStatus === 'Married' && !formData.spouseIncome;
            setStepError(await submitOnboarding({
                ...formData,
                cityTier: formData.cityTier as CityTier,
                dependentDetails,
                dependents: dependentDetails.length + (spouseDependent ? 1 : 0),
            }));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Existing users can leave without changes; new users must finish so the strategy has real inputs.
    const handleSaveAndExit = async () => {
        if (user.onboardingCompleted) {
            setCurrentScreen('dashboard');
            return;
        }
        await handleComplete();
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
                    <Progress value={progress} aria-label="Onboarding progress" className="h-2" />
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

                                <DescribeYourself onDraft={applyDraft} />

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
                                                value={formData.cityTier}
                                                onChange={(e) => updateField('cityTier', e.target.value as CityTier)}
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
                                        <Label className="font-bold text-foreground">Marital Status</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {(['Single', 'Married'] as const).map(status => (
                                                <Button
                                                    key={status}
                                                    type="button"
                                                    variant={formData.maritalStatus === status ? "default" : "outline"}
                                                    className={`py-6 font-bold ${formData.maritalStatus === status ? 'bg-blue-600 text-white' : 'dark:hover:bg-slate-800'}`}
                                                    onClick={() => updateField('maritalStatus', status)}
                                                >
                                                    {status}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {formData.maritalStatus === 'Married' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="spouse-income-input" className="font-bold text-foreground">Partner's Annual Income (INR)</Label>
                                            <Input
                                                id="spouse-income-input"
                                                type="number"
                                                min={0}
                                                value={formData.spouseIncome || ''}
                                                onChange={(e) => updateField('spouseIncome', Number(e.target.value))}
                                                placeholder="0 if they don't work"
                                                aria-describedby="spouse-income-help"
                                                className="bg-muted/30 font-mono"
                                            />
                                            <p id="spouse-income-help" className="text-xs text-muted-foreground">
                                                A working partner's income reduces how much of yours the family would need replaced.
                                            </p>
                                        </div>
                                    )}

                                    <fieldset className="space-y-3">
                                        <legend className="font-bold text-foreground text-sm">Who depends on you financially?</legend>
                                        <p className="text-xs text-muted-foreground">
                                            Children, parents or siblings you support. {formData.maritalStatus === 'Married' ? 'A non-earning spouse is counted automatically.' : ''}
                                        </p>
                                        {formData.dependentDetails.length === 0 && (
                                            <p className="text-sm text-muted-foreground">No dependents added.</p>
                                        )}
                                        {formData.dependentDetails.map((d, i) => (
                                            <div key={i} className="flex flex-wrap items-center gap-2 sm:gap-3">
                                                <select
                                                    aria-label={`Relationship of dependent ${i + 1}`}
                                                    value={d.relation}
                                                    onChange={(e) => updateField('dependentDetails', formData.dependentDetails.map((x, j) => j === i ? { ...x, relation: e.target.value as DependentRelation } : x))}
                                                    className="h-11 rounded-md border border-input bg-muted/30 px-3 text-sm font-medium"
                                                >
                                                    {(Object.keys(RELATION_LABEL) as DependentRelation[]).map(r => <option key={r} value={r}>{RELATION_LABEL[r]}</option>)}
                                                </select>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={110}
                                                    aria-label={`Age of dependent ${i + 1}`}
                                                    placeholder="Age"
                                                    value={d.age ?? ''}
                                                    onChange={(e) => updateField('dependentDetails', formData.dependentDetails.map((x, j) => j === i ? { ...x, age: e.target.value === '' ? null : Number(e.target.value) } : x))}
                                                    className="w-24 bg-muted/30 font-mono"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    aria-label={`Remove dependent ${i + 1}`}
                                                    onClick={() => updateField('dependentDetails', formData.dependentDetails.filter((_, j) => j !== i))}
                                                    className="text-muted-foreground hover:text-red-600"
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={formData.dependentDetails.length >= MAX_DEPENDENTS}
                                            onClick={() => updateField('dependentDetails', [...formData.dependentDetails, { relation: 'child', age: null }])}
                                            className="font-bold"
                                        >
                                            + Add Dependent
                                        </Button>
                                    </fieldset>

                                    <div className="space-y-4 pt-6 border-t border-border">
                                        <Label className="font-bold text-foreground">Total Outstanding Liabilities</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="home-loan-input" className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Home Loan</Label>
                                                <Input
                                                    id="home-loan-input"
                                                    type="number"
                                                    value={formData.homeLoan || ''}
                                                    onChange={(e) => updateField('homeLoan', Number(e.target.value))}
                                                    placeholder="₹ 0.00"
                                                    className="bg-muted/30 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="other-loans-input" className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Other Loans</Label>
                                                <Input
                                                    id="other-loans-input"
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
                                        <Label htmlFor="expenses-input" className="font-bold text-foreground">Monthly Expenses (excluding loan EMIs)</Label>
                                        <Input
                                            id="expenses-input"
                                            type="number"
                                            value={formData.monthlyExpenses || ''}
                                            onChange={(e) => updateField('monthlyExpenses', Number(e.target.value))}
                                            placeholder="₹ Enter average amount"
                                            className="py-6 bg-muted/30 font-mono"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="emi-input" className="font-bold text-foreground">Total Monthly EMIs</Label>
                                            <Input
                                                id="emi-input"
                                                type="number"
                                                min={0}
                                                value={formData.loanEmi || ''}
                                                onChange={(e) => updateField('loanEmi', Number(e.target.value))}
                                                placeholder="₹ 0 if no loans"
                                                className="bg-muted/30 font-mono"
                                            />
                                        </div>
                                        {formData.homeLoan > 0 && (
                                            <div className="space-y-2">
                                                <Label htmlFor="loan-years-input" className="font-bold text-foreground">Home Loan Years Left</Label>
                                                <Input
                                                    id="loan-years-input"
                                                    type="number"
                                                    min={0}
                                                    max={40}
                                                    value={formData.homeLoanYearsLeft || ''}
                                                    onChange={(e) => updateField('homeLoanYearsLeft', Number(e.target.value))}
                                                    placeholder="e.g. 15"
                                                    className="bg-muted/30 font-mono"
                                                />
                                            </div>
                                        )}
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
                                            <Label htmlFor="life-cover-input" className="font-bold text-foreground">Existing Life Cover</Label>
                                            <Input
                                                id="life-cover-input"
                                                type="number"
                                                value={formData.existingLifeCover || ''}
                                                onChange={(e) => updateField('existingLifeCover', Number(e.target.value))}
                                                placeholder="₹ Total Sum Assured"
                                                className="bg-muted/30 font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="health-cover-input" className="font-bold text-foreground">Existing Health Cover</Label>
                                            <Input
                                                id="health-cover-input"
                                                type="number"
                                                value={formData.existingHealthCover || ''}
                                                onChange={(e) => updateField('existingHealthCover', Number(e.target.value))}
                                                placeholder="₹ Floater/Individual"
                                                className="bg-muted/30 font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ci-cover-input" className="font-bold text-foreground">Critical Illness Cover</Label>
                                            <Input
                                                id="ci-cover-input"
                                                type="number"
                                                min={0}
                                                value={formData.existingCiCover || ''}
                                                onChange={(e) => updateField('existingCiCover', Number(e.target.value))}
                                                placeholder="₹ Lump sum, incl. riders"
                                                className="bg-muted/30 font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="pa-cover-input" className="font-bold text-foreground">Accident & Disability Cover</Label>
                                            <Input
                                                id="pa-cover-input"
                                                type="number"
                                                min={0}
                                                value={formData.existingPaCover || ''}
                                                onChange={(e) => updateField('existingPaCover', Number(e.target.value))}
                                                placeholder="₹ Personal accident sum insured"
                                                className="bg-muted/30 font-mono"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground -mt-2">Policies you hold yourself. Employer cover ends with your job, so tick it under benefits instead.</p>

                                    {formData.dependentDetails.some(d => d.relation === 'parent') && (
                                        <div className="space-y-2">
                                            <Label htmlFor="parents-cover-input" className="font-bold text-foreground">Parents' Existing Health Cover</Label>
                                            <Input
                                                id="parents-cover-input"
                                                type="number"
                                                min={0}
                                                value={formData.parentsHealthCover || ''}
                                                onChange={(e) => updateField('parentsHealthCover', Number(e.target.value))}
                                                placeholder="₹ 0 if they have none"
                                                className="bg-muted/30 font-mono"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="savings-input" className="font-bold text-foreground">Savings & Investments</Label>
                                        <Input
                                            id="savings-input"
                                            type="number"
                                            min={0}
                                            value={formData.liquidSavings || ''}
                                            onChange={(e) => updateField('liquidSavings', Number(e.target.value))}
                                            placeholder="₹ FDs, mutual funds, stocks"
                                            aria-describedby="savings-help"
                                            className="bg-muted/30 font-mono"
                                        />
                                        <p id="savings-help" className="text-xs text-muted-foreground">
                                            Money your family could use if needed. Leave out your home and locked retirement funds like PF.
                                        </p>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-border">
                                        <Label className="font-bold text-foreground">Employer Benefits</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {["Group Term Life", "Group Health", "Critical Illness", "Accident Cover", "OPD Benefits"].map(benefit => (
                                                // A real <label> makes the whole tile toggle the checkbox exactly once.
                                                <label
                                                    key={benefit}
                                                    className="flex items-center gap-3 p-4 border border-border rounded-xl hover:bg-muted/30 cursor-pointer transition-colors group"
                                                >
                                                    <Checkbox
                                                        checked={formData.employerBenefits.includes(benefit)}
                                                        onCheckedChange={() => toggleBenefit(benefit)}
                                                    />
                                                    <span className="font-bold text-sm text-muted-foreground group-hover:text-blue-600 transition-colors">
                                                        {benefit}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="font-bold text-foreground">Lifestyle Risk Indicators</Label>
                                        <div className="flex flex-wrap gap-4">
                                            {["Tobacco/Smoking", "High-Risk Hobbies", "Frequent Int'l Travel"].map(risk => (
                                                <label
                                                    key={risk}
                                                    className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-full border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                                                >
                                                    <Checkbox
                                                        checked={formData.lifestyleRisks.includes(risk)}
                                                        onCheckedChange={() => toggleRisk(risk)}
                                                    />
                                                    <span className="text-xs font-bold text-muted-foreground">{risk}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation buttons */}
                        <div className="flex flex-col gap-4 pt-8 border-t border-border">
                            {stepError && <p role="alert" className="text-sm font-medium text-red-600 text-center">{stepError}</p>}
                            {/* Phones stack the buttons full width, primary action on top. */}
                            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                                {step > 1 ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full sm:w-auto sm:flex-1 py-7 font-bold text-muted-foreground hover:text-blue-600"
                                        onClick={prevStep}
                                        disabled={isSubmitting}
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                ) : <div className="hidden sm:block sm:flex-1" />}

                                <Button
                                    type="button"
                                    disabled={isSubmitting}
                                    className="w-full sm:w-auto sm:flex-2 py-7 px-6 sm:px-10 bg-blue-600 hover:bg-blue-700 font-bold text-base sm:text-lg text-white"
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
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                <Lock className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Saved to your account · Your name and email are never sent to the AI</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer info */}
                <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-2 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                    <a href="#" className="hover:text-blue-600">Privacy Policy</a>
                    <a href="#" className="hover:text-blue-600">Protocol Disclosures</a>
                    <a href="#" className="hover:text-blue-600">Compliance Audit</a>
                </div>
            </main>
        </div>
    );
};
