import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, RefreshCw, ShieldAlert, AlertTriangle, Info, Sparkles } from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { providerLabel } from '@/lib/utils';

const severityIcon = { critical: ShieldAlert, warning: AlertTriangle, info: Info };
const severityColor = { critical: 'text-red-400', warning: 'text-amber-400', info: 'text-blue-400' };
const urgencyColor = { high: 'bg-red-500/15 text-red-300', medium: 'bg-amber-500/15 text-amber-300', low: 'bg-blue-500/15 text-blue-300' };

/** AI-written strategy when available, otherwise the deterministic insights the backend computed. */
export const AiStrategyPanel: React.FC<{ maxInsights?: number }> = ({ maxInsights = 4 }) => {
    const { strategy, aiStrategy, aiProvider, isGeneratingAi, aiError, generateAiStrategy } = useApp();

    return (
        <Card className="p-8 border-none bg-slate-950 text-white space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Brain className="w-32 h-32 text-blue-500" />
            </div>
            <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.3em]">
                        {aiStrategy ? 'AI Protection Strategy' : 'Key Findings'}
                    </h3>
                    {aiStrategy && (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            {providerLabel(aiStrategy.provider)} · {new Date(aiStrategy.createdAt).toLocaleDateString('en-IN')}
                        </span>
                    )}
                </div>

                {aiStrategy ? (
                    <div className="space-y-5">
                        <p className="text-sm text-slate-200 leading-relaxed">{aiStrategy.strategy.summary}</p>
                        <ol className="space-y-4">
                            {aiStrategy.strategy.priorities.map((p, i) => (
                                <li key={i} className="space-y-1.5 border-l-2 border-blue-500/30 pl-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold">{i + 1}. {p.title}</span>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${urgencyColor[p.urgency]}`}>{p.urgency}</span>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed">{p.action}</p>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">{p.rationale}</p>
                                </li>
                            ))}
                        </ol>
                        {aiStrategy.strategy.watchouts.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Watch out for</p>
                                <ul className="space-y-1.5">
                                    {aiStrategy.strategy.watchouts.map((w, i) => (
                                        <li key={i} className="text-[11px] text-slate-400 leading-relaxed">• {w}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : strategy ? (
                    <div className="space-y-4">
                        {strategy.insights.slice(0, maxInsights).map((insight, i) => {
                            const Icon = severityIcon[insight.severity];
                            return (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl">
                                        <p className="text-sm font-bold">{insight.title}</p>
                                        <Icon className={`w-5 h-5 shrink-0 ${severityColor[insight.severity]}`} />
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-relaxed pl-1">{insight.detail}</p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400">Loading your strategy…</p>
                )}

                {aiError && <p role="alert" className="text-xs text-red-400">{aiError}</p>}

                {aiProvider ? (
                    <Button
                        onClick={() => generateAiStrategy(Boolean(aiStrategy))}
                        disabled={isGeneratingAi || !strategy}
                        className="w-full bg-blue-600 hover:bg-blue-700 py-6 font-black uppercase tracking-widest text-[10px] text-white"
                    >
                        {isGeneratingAi ? (
                            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Writing your strategy…</span>
                        ) : aiStrategy ? (
                            <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Regenerate AI Strategy</span>
                        ) : (
                            <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Generate AI Strategy</span>
                        )}
                    </Button>
                ) : (
                    strategy && <p className="text-[10px] text-slate-400 uppercase tracking-widest">AI strategy is not configured on this server.</p>
                )}
                <p className="text-[9px] text-slate-400 leading-relaxed">
                    Analytical guidance from your profile, not regulated financial advice. Only anonymised figures are sent to the AI provider.
                </p>
            </div>
        </Card>
    );
};
