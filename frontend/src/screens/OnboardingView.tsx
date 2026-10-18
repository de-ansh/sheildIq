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
import { HEALTH_CONDITIONS, useApp, type HealthCondition } from '@/lib/AppContext';
import type { AiProfileDraft, CityTier } from '@/lib/api';
import { DescribeYourself } from '@/components/DescribeYourself';
import { householdOf, type DependentRelation } from '@/lib/household';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/locales/en';

type DependentRow = { relation: DependentRelation; age: number | null };
const RELATIONS: DependentRelation[] = ['child', 'parent', 'sibling'];
const TIERS = ['Tier 1 (Metro)', 'Tier 2 (Emerging Metro)', 'Tier 3 (Urban Center)'] as const;
const BENEFITS = ['Group Term Life', 'Group Health', 'Critical Illness', 'Accident Cover', 'OPD Benefits'] as const;
const RISKS = ['Tobacco/Smoking', 'High-Risk Hobbies', "Frequent Int'l Travel"] as const;
const validBody = (cm: number, kg: number) => (cm === 0 || (Number.isInteger(cm) && cm >= 100 && cm <= 230)) && (kg === 0 || (Number.isInteger(kg) && kg >= 25 && kg <= 250));
const MAX_DEPENDENTS = 12;

export const OnboardingView: React.FC = () => {
    const { user, submitOnboarding, setCurrentScreen } = useApp();
    const { t, tServer } = useI18n();
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
        spouseAge: user.spouseAge,
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
        healthConditions: user.healthConditions,
        heightCm: user.heightCm,
        weightKg: user.weightKg,
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

    const toggleCondition = (condition: HealthCondition) => {
        setFormData(prev => ({
            ...prev,
            healthConditions: prev.healthConditions.includes(condition)
                ? prev.healthConditions.filter(c => c !== condition)
                : [...prev.healthConditions, condition],
        }));
    };

    // Returns an error for the first step whose required answers are missing, checking steps 1..upTo.
    const validate = (upTo: number): { step: number; error: MessageKey } | null => {
        const { age, income, cityTier, monthlyExpenses } = formData;
        if (!Number.isInteger(age) || age < 18 || age > 100) return { step: 1, error: 'onb.errAge' };
        if (!(income > 0)) return { step: 1, error: 'onb.errIncome' };
        if (!cityTier) return { step: 1, error: 'onb.errCity' };
        if (upTo >= 2 && !(monthlyExpenses > 0)) return { step: 2, error: 'onb.errExpenses' };
        const amounts = [formData.homeLoan, formData.otherLoans, formData.existingLifeCover, formData.existingHealthCover, formData.liquidSavings, formData.spouseIncome, formData.parentsHealthCover, formData.loanEmi, formData.existingCiCover, formData.existingPaCover];
        if (upTo >= 2 && amounts.some(v => !(v >= 0))) return { step: 2, error: 'onb.errNegative' };
        if (upTo >= 2 && !(Number.isInteger(formData.homeLoanYearsLeft) && formData.homeLoanYearsLeft >= 0 && formData.homeLoanYearsLeft <= 40)) {
            return { step: 2, error: 'onb.errLoanYears' };
        }
        if (upTo >= 2 && formData.maritalStatus === 'Married' && formData.spouseAge !== 0 && !(Number.isInteger(formData.spouseAge) && formData.spouseAge >= 18 && formData.spouseAge <= 100)) {
            return { step: 2, error: 'onb.errPartnerAge' };
        }
        if (upTo >= 2 && formData.dependentDetails.some(d => d.age === null || !Number.isInteger(d.age) || d.age < 0 || d.age > 110)) {
            return { step: 2, error: 'onb.errDependentAge' };
        }
        if (upTo >= 3 && !validBody(formData.heightCm, formData.weightKg)) return { step: 3, error: 'onb.errBody' };
        return null;
    };

    // Only fields the AI actually found are applied; everything stays editable before saving.
    const applyDraft = (draft: AiProfileDraft) => {
        const lists = ['notes', 'employerBenefits', 'lifestyleRisks', 'healthConditions', 'dependentDetails', 'dependents'];
        const found = Object.entries(draft).filter(([key, value]) => value != null && !lists.includes(key));
        setFormData(prev => ({
            ...prev,
            ...Object.fromEntries(found),
            employerBenefits: draft.employerBenefits.length ? draft.employerBenefits : prev.employerBenefits,
            lifestyleRisks: draft.lifestyleRisks.length ? draft.lifestyleRisks : prev.lifestyleRisks,
            // ?? []: a backend from before this field existed omits it.
            healthConditions: draft.healthConditions?.length
                ? draft.healthConditions.filter((c): c is HealthCondition => (HEALTH_CONDITIONS as readonly string[]).includes(c))
                : prev.healthConditions,
            dependentDetails: draft.dependentDetails.length ? draft.dependentDetails : prev.dependentDetails,
        }));
        setStepError(null);
    };

    const nextStep = () => {
        const problem = validate(step);
        setStepError(problem ? t(problem.error) : null);
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
            setStepError(t(problem.error));
            return;
        }
        setIsSubmitting(true);
        try {
            const dependentDetails = formData.dependentDetails.map(d => ({ relation: d.relation, age: d.age as number }));
            const spouseDependent = formData.maritalStatus === 'Married' && !formData.spouseIncome;
            setStepError(tServer(await submitOnboarding({
                ...formData,
                cityTier: formData.cityTier as CityTier,
                dependentDetails,
                dependents: dependentDetails.length + (spouseDependent ? 1 : 0),
            })));
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
                    {t('onb.saveExit')}
                </Button>
            </header>

            <main className="flex-grow flex flex-col items-center py-12 px-4 max-w-4xl mx-auto w-full">
                {/* Progress Tracker */}
                <div className="w-full max-w-[600px] mb-12 space-y-4">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">{t('onb.stepOf', { step })}</p>
                            <h2 className="text-lg font-bold text-foreground">
                                {step === 1 && t('onb.step1')}
                                {step === 2 && t('onb.step2')}
                                {step === 3 && t('onb.step3')}
                            </h2>
                        </div>
                        <p className="text-sm font-black text-muted-foreground font-mono">{Math.round(progress)}%</p>
                    </div>
                    <Progress value={progress} aria-label={t('onb.progress')} className="h-2" />
                </div>

                {/* Step Content */}
                <Card className="w-full max-w-[650px] border-border bg-card shadow-xl p-8 md:p-12">
                    <CardContent className="p-0 space-y-8">
                        {step === 1 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="text-center space-y-2">
                                    <h1 className="text-3xl font-black text-foreground tracking-tight">{t('onb.title1')}</h1>
                                    <p className="text-muted-foreground font-medium">{t('onb.sub1')}</p>
                                </div>

                                <DescribeYourself onDraft={applyDraft} />

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="age-input" className="font-bold text-foreground">{t('onb.age')}</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="age-input"
                                                type="number"
                                                min={18}
                                                max={100}
                                                value={formData.age || ''}
                                                onChange={(e) => updateField('age', Number(e.target.value))}
                                                placeholder={t('onb.agePlaceholder')}
                                                className="pl-12 py-6 bg-muted/30"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="income-input" className="font-bold text-foreground">{t('onb.income')}</Label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">₹</span>
                                            <Input
                                                id="income-input"
                                                type="number"
                                                value={formData.income || ''}
                                                onChange={(e) => updateField('income', Number(e.target.value))}
                                                placeholder={t('onb.incomePlaceholder')}
                                                className="pl-12 py-6 bg-muted/30"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="city-select" className="font-bold text-foreground">{t('onb.city')}</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <select
                                                id="city-select"
                                                value={formData.cityTier}
                                                onChange={(e) => updateField('cityTier', e.target.value as CityTier)}
                                                className="flex h-12 w-full rounded-md border border-input bg-muted/30 px-12 py-2 text-base shadow-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
                                            >
                                                <option value="">{t('onb.cityPlaceholder')}</option>
                                                {TIERS.map(tier => <option key={tier} value={tier}>{t(`tier.${tier}`)}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="occupation-input" className="font-bold text-foreground">{t('onb.occupation')}</Label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="occupation-input"
                                                value={formData.occupation}
                                                onChange={(e) => updateField('occupation', e.target.value)}
                                                placeholder={t('onb.occupationPlaceholder')}
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
                                    <h1 className="text-3xl font-black text-foreground tracking-tight">{t('onb.title2')}</h1>
                                    <p className="text-muted-foreground font-medium">{t('onb.sub2')}</p>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <Label className="font-bold text-foreground">{t('onb.marital')}</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {(['Single', 'Married'] as const).map(status => (
                                                <Button
                                                    key={status}
                                                    type="button"
                                                    variant={formData.maritalStatus === status ? "default" : "outline"}
                                                    className={`py-6 font-bold ${formData.maritalStatus === status ? 'bg-blue-600 text-white' : 'dark:hover:bg-slate-800'}`}
                                                    onClick={() => updateField('maritalStatus', status)}
                                                >
                                                    {t(`marital.${status}`)}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {formData.maritalStatus === 'Married' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="spouse-income-input" className="font-bold text-foreground">{t('onb.partnerIncome')}</Label>
                                            <Input
                                                id="spouse-income-input"
                                                type="number"
                                                min={0}
                                                value={formData.spouseIncome || ''}
                                                onChange={(e) => updateField('spouseIncome', Number(e.target.value))}
                                                placeholder={t('onb.partnerIncomePlaceholder')}
                                                aria-describedby="spouse-income-help"
                                                className="bg-muted/30 font-mono"
                                            />
                                            <p id="spouse-income-help" className="text-xs text-muted-foreground">
                                                {t('onb.partnerIncomeHelp')}
                                            </p>
                                            <Label htmlFor="spouse-age-input" className="font-bold text-foreground block pt-2">{t('onb.partnerAge')}</Label>
                                            <Input
                                                id="spouse-age-input"
                                                type="number"
                                                inputMode="numeric"
                                                min={18}
                                                max={100}
                                                value={formData.spouseAge || ''}
                                                onChange={(e) => updateField('spouseAge', Number(e.target.value))}
                                                placeholder={t('onb.partnerAgePlaceholder')}
                                                className="bg-muted/30 font-mono"
                                            />
                                        </div>
                                    )}

                                    <fieldset className="space-y-3">
                                        <legend className="font-bold text-foreground text-sm">{t('onb.dependents')}</legend>
                                        <p className="text-xs text-muted-foreground">
                                            {t('onb.dependentsHelp')} {formData.maritalStatus === 'Married' ? t('onb.spouseCounted') : ''}
                                        </p>
                                        {formData.dependentDetails.length === 0 && (
                                            <p className="text-sm text-muted-foreground">{t('onb.noDependents')}</p>
                                        )}
                                        {formData.dependentDetails.map((d, i) => (
                                            <div key={i} className="flex flex-wrap items-center gap-2 sm:gap-3">
                                                <select
                                                    aria-label={t('onb.relationOf', { n: i + 1 })}
                                                    value={d.relation}
                                                    onChange={(e) => updateField('dependentDetails', formData.dependentDetails.map((x, j) => j === i ? { ...x, relation: e.target.value as DependentRelation } : x))}
                                                    className="h-11 rounded-md border border-input bg-muted/30 px-3 text-sm font-medium"
                                                >
                                                    {RELATIONS.map(r => <option key={r} value={r}>{t(`relation.${r}`)}</option>)}
                                                </select>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={110}
                                                    aria-label={t('onb.ageOf', { n: i + 1 })}
                                                    placeholder={t('onb.agePlaceholderShort')}
                                                    value={d.age ?? ''}
                                                    onChange={(e) => updateField('dependentDetails', formData.dependentDetails.map((x, j) => j === i ? { ...x, age: e.target.value === '' ? null : Number(e.target.value) } : x))}
                                                    className="w-24 bg-muted/30 font-mono"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    aria-label={t('onb.removeDependent', { n: i + 1 })}
                                                    onClick={() => updateField('dependentDetails', formData.dependentDetails.filter((_, j) => j !== i))}
                                                    className="text-muted-foreground hover:text-red-600"
                                                >
                                                    {t('onb.remove')}
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
                                            {t('onb.addDependent')}
                                        </Button>
                                    </fieldset>

                                    <div className="space-y-4 pt-6 border-t border-border">
                                        <Label className="font-bold text-foreground">{t('onb.liabilities')}</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="home-loan-input" className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{t('onb.homeLoan')}</Label>
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
                                                <Label htmlFor="other-loans-input" className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{t('onb.otherLoans')}</Label>
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
                                        <Label htmlFor="expenses-input" className="font-bold text-foreground">{t('onb.expenses')}</Label>
                                        <Input
                                            id="expenses-input"
                                            type="number"
                                            value={formData.monthlyExpenses || ''}
                                            onChange={(e) => updateField('monthlyExpenses', Number(e.target.value))}
                                            placeholder={t('onb.expensesPlaceholder')}
                                            className="py-6 bg-muted/30 font-mono"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="emi-input" className="font-bold text-foreground">{t('onb.emi')}</Label>
                                            <Input
                                                id="emi-input"
                                                type="number"
                                                min={0}
                                                value={formData.loanEmi || ''}
                                                onChange={(e) => updateField('loanEmi', Number(e.target.value))}
                                                placeholder={t('onb.emiPlaceholder')}
                                                className="bg-muted/30 font-mono"
                                            />
                                        </div>
                                        {formData.homeLoan > 0 && (
                                            <div className="space-y-2">
                                                <Label htmlFor="loan-years-input" className="font-bold text-foreground">{t('onb.loanYears')}</Label>
                                                <Input
                                                    id="loan-years-input"
                                                    type="number"
                                                    min={0}
                                                    max={40}
                                                    value={formData.homeLoanYearsLeft || ''}
                                                    onChange={(e) => updateField('homeLoanYearsLeft', Number(e.target.value))}
                                                    placeholder={t('onb.loanYearsPlaceholder')}
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
                                    <h1 className="text-3xl font-black text-foreground tracking-tight">{t('onb.title3')}</h1>
                                    <p className="text-muted-foreground font-medium">{t('onb.sub3')}</p>
                                </div>

                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="life-cover-input" className="font-bold text-foreground">{t('onb.lifeCover')}</Label>
                                            <Input
                                                id="life-cover-input"
                                                type="number"
                                                value={formData.existingLifeCover || ''}
                                                onChange={(e) => updateField('existingLifeCover', Number(e.target.value))}
                                                placeholder={t('onb.lifeCoverPlaceholder')}
                                                className="bg-muted/30 font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="health-cover-input" className="font-bold text-foreground">{t('onb.healthCover')}</Label>
                                            <Input
                                                id="health-cover-input"
                                                type="number"
                                                value={formData.existingHealthCover || ''}
                                                onChange={(e) => updateField('existingHealthCover', Number(e.target.value))}
                                                placeholder={t('onb.healthCoverPlaceholder')}
                                                className="bg-muted/30 font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ci-cover-input" className="font-bold text-foreground">{t('onb.ciCover')}</Label>
                                            <Input
                                                id="ci-cover-input"
                                                type="number"
                                                min={0}
                                                value={formData.existingCiCover || ''}
                                                onChange={(e) => updateField('existingCiCover', Number(e.target.value))}
                                                placeholder={t('onb.ciCoverPlaceholder')}
                                                className="bg-muted/30 font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="pa-cover-input" className="font-bold text-foreground">{t('onb.paCover')}</Label>
                                            <Input
                                                id="pa-cover-input"
                                                type="number"
                                                min={0}
                                                value={formData.existingPaCover || ''}
                                                onChange={(e) => updateField('existingPaCover', Number(e.target.value))}
                                                placeholder={t('onb.paCoverPlaceholder')}
                                                className="bg-muted/30 font-mono"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground -mt-2">{t('onb.ownPolicies')}</p>

                                    {formData.dependentDetails.some(d => d.relation === 'parent') && (
                                        <div className="space-y-2">
                                            <Label htmlFor="parents-cover-input" className="font-bold text-foreground">{t('onb.parentsCover')}</Label>
                                            <Input
                                                id="parents-cover-input"
                                                type="number"
                                                min={0}
                                                value={formData.parentsHealthCover || ''}
                                                onChange={(e) => updateField('parentsHealthCover', Number(e.target.value))}
                                                placeholder={t('onb.parentsCoverPlaceholder')}
                                                className="bg-muted/30 font-mono"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="savings-input" className="font-bold text-foreground">{t('onb.savings')}</Label>
                                        <Input
                                            id="savings-input"
                                            type="number"
                                            min={0}
                                            value={formData.liquidSavings || ''}
                                            onChange={(e) => updateField('liquidSavings', Number(e.target.value))}
                                            placeholder={t('onb.savingsPlaceholder')}
                                            aria-describedby="savings-help"
                                            className="bg-muted/30 font-mono"
                                        />
                                        <p id="savings-help" className="text-xs text-muted-foreground">
                                            {t('onb.savingsHelp')}
                                        </p>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-border">
                                        <Label className="font-bold text-foreground">{t('onb.benefits')}</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {BENEFITS.map(benefit => (
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
                                                        {t(`benefit.${benefit}`)}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="font-bold text-foreground">{t('onb.risks')}</Label>
                                        <div className="flex flex-wrap gap-4">
                                            {RISKS.map(risk => (
                                                <label
                                                    key={risk}
                                                    className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-full border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                                                >
                                                    <Checkbox
                                                        checked={formData.lifestyleRisks.includes(risk)}
                                                        onCheckedChange={() => toggleRisk(risk)}
                                                    />
                                                    <span className="text-xs font-bold text-muted-foreground">{t(`risk.${risk}`)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-border"><fieldset className="space-y-4">
                                        <legend className="font-bold text-foreground text-sm">{t('onb.health')}</legend>
                                        <p className="text-xs text-muted-foreground">{t('onb.healthHelp')}</p>
                                        <div className="flex flex-wrap gap-3">
                                            {HEALTH_CONDITIONS.map(condition => (
                                                <label
                                                    key={condition}
                                                    className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-full border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                                                >
                                                    <Checkbox
                                                        checked={formData.healthConditions.includes(condition)}
                                                        onCheckedChange={() => toggleCondition(condition)}
                                                    />
                                                    <span className="text-xs font-bold text-muted-foreground">{t(`condition.${condition}`)}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="height-input" className="font-bold text-foreground">{t('onb.height')}</Label>
                                                <Input
                                                    id="height-input"
                                                    type="number"
                                                    inputMode="numeric"
                                                    min={100}
                                                    max={230}
                                                    value={formData.heightCm || ''}
                                                    onChange={(e) => updateField('heightCm', Number(e.target.value))}
                                                    placeholder={t('onb.heightPlaceholder')}
                                                    className="bg-muted/30 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="weight-input" className="font-bold text-foreground">{t('onb.weight')}</Label>
                                                <Input
                                                    id="weight-input"
                                                    type="number"
                                                    inputMode="numeric"
                                                    min={25}
                                                    max={250}
                                                    value={formData.weightKg || ''}
                                                    onChange={(e) => updateField('weightKg', Number(e.target.value))}
                                                    placeholder={t('onb.weightPlaceholder')}
                                                    className="bg-muted/30 font-mono"
                                                />
                                            </div>
                                        </div>
                                    </fieldset></div>
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
                                        {t('onb.back')}
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
                                            {t('onb.saving')}
                                        </span>
                                    ) : (
                                        <>
                                            {step === 3 ? t('onb.generate') : t('onb.continue')}
                                            <ArrowRight className="w-5 h-5 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                <Lock className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{t('onb.privacyNote')}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer info */}
                <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-2 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                    <a href="#" className="hover:text-blue-600">{t('onb.privacyPolicy')}</a>
                    <a href="#" className="hover:text-blue-600">{t('onb.disclosures')}</a>
                    <a href="#" className="hover:text-blue-600">{t('onb.complianceAudit')}</a>
                </div>
            </main>
        </div>
    );
};
