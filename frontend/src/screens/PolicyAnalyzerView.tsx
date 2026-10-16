import React, { useRef, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileSearch, Upload, Loader2, AlertTriangle, ShieldCheck, Clock, Ban, Gauge, CheckCircle2, Plus } from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi, type PolicyAnalysis, type PolicyFit } from '@/lib/api';
import { formatINR, providerLabel } from '@/lib/utils';

const MAX_BYTES = 4 * 1024 * 1024; // must match the server's MAX_PDF_BYTES
const TYPE_LABEL: Record<PolicyAnalysis['policyType'], string> = {
    term_life: 'Term Life',
    health: 'Health',
    critical_illness: 'Critical Illness',
    personal_accident: 'Personal Accident',
    savings_or_ulip: 'Savings / ULIP',
    other: 'Other',
};

const readAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });

export const PolicyAnalyzerView: React.FC = () => {
    const { aiProvider, user, updateUserProfile, setCurrentScreen } = useApp();
    const fileRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ analysis: PolicyAnalysis; fit: PolicyFit | null } | null>(null);
    const [confirmNew, setConfirmNew] = useState(false);
    const [addMessage, setAddMessage] = useState<string | null>(null);

    const handleFile = async (file: File | undefined) => {
        if (!file || isLoading) return;
        setError(null);
        setResult(null);
        setAddMessage(null);
        setConfirmNew(false);
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            setError('Please choose a PDF file.');
            return;
        }
        if (file.size > MAX_BYTES) {
            setError('That PDF is larger than 4 MB. Upload the policy schedule pages only.');
            return;
        }
        setFileName(file.name);
        setIsLoading(true);
        try {
            const res = await ShieldIQApi.analyzePolicy(file.name.toLowerCase().endsWith('.pdf') ? file.name : `${file.name}.pdf`, await readAsBase64(file));
            if (res && res.success) setResult({ analysis: res.analysis, fit: res.fit });
            else setError(res?.error || 'Could not read this policy. Please try again.');
        } catch {
            setError('Could not read that file from your device.');
        } finally {
            setIsLoading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const addToCover = async () => {
        if (!result?.fit || result.analysis.sumAssured === null) return;
        const amount = result.analysis.sumAssured;
        const update = result.fit.category === 'life'
            ? { existingLifeCover: user.existingLifeCover + amount }
            : { existingHealthCover: user.existingHealthCover + amount };
        const err = await updateUserProfile(update);
        setAddMessage(err ?? `Added ${formatINR(amount)} to your ${result.fit.category} cover. Your strategy has been recalculated.`);
    };

    const a = result?.analysis;
    const sections = a
        ? [
            { title: 'Key Benefits', items: a.keyBenefits, icon: ShieldCheck, tone: 'text-emerald-600' },
            { title: 'Waiting Periods', items: a.waitingPeriods, icon: Clock, tone: 'text-blue-600' },
            { title: 'Sub-limits & Co-pays', items: a.subLimits, icon: Gauge, tone: 'text-amber-600' },
            { title: 'Exclusions', items: a.exclusions, icon: Ban, tone: 'text-slate-500' },
        ]
        : [];

    return (
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 text-foreground font-sans">
            <header className="space-y-2">
                <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30 text-blue-600 bg-blue-50 dark:bg-blue-950/30">AI Policy Scan</Badge>
                <h1 className="text-4xl font-black tracking-tight">Policy Analyzer</h1>
                <p className="text-muted-foreground text-lg max-w-2xl">
                    Upload a policy document or schedule. ShieldIQ pulls out what it really covers, the fine print that causes claim rejections, and how it fits your gaps.
                </p>
            </header>

            {!aiProvider ? (
                <Card className="p-8 text-sm text-muted-foreground">AI features are not configured on this server.</Card>
            ) : (
                <Card className="p-8 border-dashed border-2 border-border">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600"><FileSearch className="w-6 h-6" /></div>
                            <div className="space-y-1">
                                <p className="font-bold">{fileName ?? 'Choose a policy PDF (up to 4 MB)'}</p>
                                <p className="text-xs text-muted-foreground max-w-xl">
                                    The document, which may include your name and policy number, is sent to {providerLabel(aiProvider)} to be read, with provider storage turned off.
                                    ShieldIQ does not keep the file.
                                </p>
                            </div>
                        </div>
                        <input
                            ref={fileRef}
                            id="policy-file"
                            type="file"
                            accept="application/pdf,.pdf"
                            className="sr-only"
                            onChange={e => handleFile(e.target.files?.[0])}
                        />
                        <Button asChild disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 font-bold shrink-0">
                            <label htmlFor="policy-file" className="cursor-pointer">
                                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                {isLoading ? 'Reading policy…' : fileName ? 'Analyze Another' : 'Upload Policy'}
                            </label>
                        </Button>
                    </div>
                    {error && <p role="alert" className="mt-4 text-sm font-medium text-red-600">{error}</p>}
                </Card>
            )}

            {a && !a.isInsurancePolicy && (
                <Card className="p-6 flex items-center gap-3 text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-500" /> This document doesn't look like an insurance policy. Try the policy schedule or wording PDF.
                </Card>
            )}

            {a && a.isInsurancePolicy && (
                <div className="space-y-8" aria-live="polite">
                    <Card className="p-8 space-y-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-blue-600 text-white border-none text-[10px]">{TYPE_LABEL[a.policyType]}</Badge>
                                    {a.insurer && <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{a.insurer}</span>}
                                </div>
                                <h2 className="text-2xl font-black tracking-tight">{a.policyName ?? 'Insurance Policy'}</h2>
                            </div>
                            <div className="grid grid-cols-3 gap-6 font-mono text-right">
                                {[
                                    { label: 'Sum Assured', value: a.sumAssured !== null ? formatINR(a.sumAssured) : '—' },
                                    { label: 'Premium / yr', value: a.annualPremium !== null ? formatINR(a.annualPremium) : '—' },
                                    { label: 'Term', value: a.policyTermYears !== null ? `${a.policyTermYears} yr` : '—' },
                                ].map(f => (
                                    <div key={f.label}>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{f.label}</p>
                                        <p className="text-lg font-black">{f.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{a.plainSummary}</p>
                    </Card>

                    {result.fit && (
                        <Card className="p-8 space-y-4 border-blue-500/30">
                            <h3 className="text-sm font-black uppercase tracking-widest text-blue-600">Fit With Your Gaps</h3>
                            <p className="text-sm">{result.fit.summary}</p>
                            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${result.fit.coversPct}%` }} />
                            </div>
                            {a.sumAssured !== null && !addMessage && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                                    <div className="flex items-center gap-3">
                                        <Checkbox id="confirm-new-policy" checked={confirmNew} onCheckedChange={c => setConfirmNew(!!c)} />
                                        <Label htmlFor="confirm-new-policy" className="text-xs">
                                            I hold this policy and it isn't already included in my declared {result.fit.category} cover ({formatINR(result.fit.category === 'life' ? user.existingLifeCover : user.existingHealthCover)}).
                                        </Label>
                                    </div>
                                    <Button onClick={addToCover} disabled={!confirmNew} variant="outline" className="font-bold shrink-0">
                                        <Plus className="w-4 h-4 mr-2" /> Add {formatINR(a.sumAssured)} to My Cover
                                    </Button>
                                </div>
                            )}
                            {addMessage && (
                                <p role="status" className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                                    <CheckCircle2 className="w-4 h-4" /> {addMessage}
                                    <Button variant="link" size="sm" onClick={() => setCurrentScreen('dashboard')}>View dashboard</Button>
                                </p>
                            )}
                        </Card>
                    )}

                    {a.redFlags.length > 0 && (
                        <Card className="p-8 space-y-3 border-red-500/30 bg-red-50/40 dark:bg-red-950/10">
                            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-red-600">
                                <AlertTriangle className="w-4 h-4" /> Red Flags
                            </h3>
                            <ul className="space-y-2">
                                {a.redFlags.map(f => <li key={f} className="text-sm leading-relaxed">• {f}</li>)}
                            </ul>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {sections.map(sec => (
                            <Card key={sec.title} className="p-6 space-y-3">
                                <h3 className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest ${sec.tone}`}>
                                    <sec.icon className="w-4 h-4" /> {sec.title}
                                </h3>
                                {sec.items.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">None found in this document.</p>
                                ) : (
                                    <ul className="space-y-1.5">
                                        {sec.items.map(item => <li key={item} className="text-xs text-muted-foreground leading-relaxed">• {item}</li>)}
                                    </ul>
                                )}
                            </Card>
                        ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        AI-extracted summary. Always confirm terms against the insurer's policy wording before relying on them.
                    </p>
                </div>
            )}
        </div>
    );
};
