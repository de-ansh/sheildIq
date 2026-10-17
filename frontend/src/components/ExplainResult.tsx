import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi, type AiExplanation, type ExplainScreen } from '@/lib/api';

interface Props {
    screen: ExplainScreen;
    inputs: Record<string, unknown>;
    result: Record<string, unknown> | null;
}

/** "Explain this" button + panel: a plain-language explanation of the current calculator result. */
export const ExplainResult: React.FC<Props> = ({ screen, inputs, result }) => {
    const { aiProvider, user } = useApp();
    const [explanation, setExplanation] = useState<{ key: string; data: AiExplanation } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // The explanation belongs to one exact set of inputs; it is marked stale once they change.
    const key = JSON.stringify([inputs, result]);
    const isStale = explanation !== null && explanation.key !== key;

    if (!aiProvider || !user.onboardingCompleted) return null;

    const explain = async () => {
        if (!result) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await ShieldIQApi.explainResult(screen, inputs, result);
            if (res && res.success) setExplanation({ key, data: res.explanation });
            else setError(res?.error || 'Could not explain this result. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4 print:hidden">
            <Button type="button" variant="outline" onClick={explain} disabled={!result || isLoading} className="font-bold border-blue-500/40 text-blue-600 hover:text-blue-700">
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {explanation && !isStale ? 'Explain Again' : 'Explain This Result'}
            </Button>
            {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
            {explanation && (
                <div className={`rounded-2xl border p-5 space-y-4 ${isStale ? 'border-border opacity-60' : 'border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20'}`} aria-live="polite">
                    {isStale && <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Inputs changed since this explanation. Click explain again to update it.</p>}
                    <p className="text-sm leading-relaxed text-foreground">{explanation.data.summary}</p>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">What drives it</p>
                        <ul className="space-y-2">
                            {explanation.data.drivers.map(d => (
                                <li key={d.factor} className="text-xs leading-relaxed">
                                    <span className="font-bold text-foreground">{d.factor}:</span> <span className="text-muted-foreground">{d.effect}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {explanation.data.whatIfs.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">What if</p>
                            <ul className="space-y-1.5">
                                {explanation.data.whatIfs.map(w => (
                                    <li key={w} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                                        <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-600" aria-hidden="true" />{w}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <p className="text-[9px] text-muted-foreground">AI explanation of the calculation above. Figures come from the calculator, not the AI.</p>
                </div>
            )}
        </div>
    );
};
