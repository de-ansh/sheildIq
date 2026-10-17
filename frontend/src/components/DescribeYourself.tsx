import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Info } from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { useI18n } from '@/lib/i18n';
import { ShieldIQApi, type AiProfileDraft } from '@/lib/api';

/** Lets the user describe themselves in plain words; AI drafts the onboarding answers for them to review. */
export const DescribeYourself: React.FC<{ onDraft: (draft: AiProfileDraft) => void }> = ({ onDraft }) => {
    const { aiProvider } = useApp();
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notes, setNotes] = useState<string[] | null>(null);

    const { t, tServer } = useI18n();

    if (!aiProvider) return null;

    const fill = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await ShieldIQApi.parseProfile(text);
            if (res && res.success) {
                onDraft(res.draft);
                setNotes(res.draft.notes);
            } else {
                setError(tServer(res?.error) || t('describe.error'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 p-5 space-y-3">
            <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <label htmlFor="describe-yourself" className="text-sm font-bold text-foreground">{t('describe.label')}</label>
            </div>
            <textarea
                id="describe-yourself"
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={t('describe.placeholder')}
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] text-muted-foreground">{t('describe.note')}</p>
                <Button type="button" size="sm" onClick={fill} disabled={text.trim().length < 20 || isLoading} className="bg-blue-600 hover:bg-blue-700 shrink-0">
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    {t('describe.fill')}
                </Button>
            </div>
            {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
            {notes && (
                <div role="status" className="rounded-xl bg-background/70 border border-border p-3 space-y-1.5">
                    <p className="text-xs font-bold text-foreground">{t('describe.filled')}</p>
                    {notes.map(n => (
                        <p key={n} className="flex gap-2 text-[11px] text-muted-foreground"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />{n}</p>
                    ))}
                </div>
            )}
        </div>
    );
};
