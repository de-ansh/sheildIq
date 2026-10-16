import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi, visibleAnswer, type ChatMessage } from '@/lib/api';

const STARTERS = [
    'Why is my life cover need this high?',
    'Should I prepay my home loan or buy more term cover?',
    'What does my health cover gap mean for my family?',
];

/** Floating "Ask ShieldIQ" chat, grounded in the signed-in user's profile and strategy. */
export const AskShieldIQ: React.FC = () => {
    const { currentScreen } = useApp();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>(STARTERS);
    const [draft, setDraft] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // The parent keys this component by account, so the saved chat loads once per signed-in user.
    const [historyLoaded, setHistoryLoaded] = useState(false);

    const openChat = () => {
        setOpen(true);
        if (historyLoaded) return;
        setHistoryLoaded(true);
        ShieldIQApi.getChatHistory().then(res => {
            if (res?.success) setMessages(prev => (prev.length ? prev : res.messages.map(({ role, content }) => ({ role, content }))));
        });
    };
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, isSending]);

    const send = async (text: string) => {
        const content = text.trim();
        if (!content || isSending) return;
        const before = messages;
        // The empty assistant message fills in as the answer streams.
        setMessages([...before, { role: 'user', content }, { role: 'assistant', content: '' }]);
        setDraft('');
        setError(null);
        setIsSending(true);
        const setAnswer = (update: (text: string) => string) =>
            setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: update(prev[prev.length - 1].content) }]);
        try {
            const res = await ShieldIQApi.streamChat(content, delta => setAnswer(text => text + delta));
            if ('reply' in res) {
                setAnswer(() => res.reply.answer);
                setSuggestions(res.reply.suggestedQuestions);
            } else {
                // Nothing was saved: drop the partial turn and give the question back to retry.
                setMessages(before);
                setDraft(content);
                setError(res.error);
            }
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    };

    // The Risk Simulator has a fixed action footer; lift the launcher above it.
    const launcherOffset = currentScreen === 'simulator' ? 'bottom-24' : 'bottom-6';

    if (!open) {
        return (
            <button
                type="button"
                onClick={openChat}
                className={`fixed ${launcherOffset} right-6 z-[60] flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-blue-600/30 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 print:hidden`}
            >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Ask ShieldIQ
            </button>
        );
    }

    return (
        <div
            role="dialog"
            aria-label="Ask ShieldIQ"
            onKeyDown={e => e.key === 'Escape' && setOpen(false)}
            className="fixed inset-x-4 bottom-4 top-24 z-[60] flex flex-col rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:right-6 sm:w-[420px] print:hidden"
        >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" aria-hidden="true" />
                    <div>
                        <h2 className="text-sm font-black tracking-tight">Ask ShieldIQ</h2>
                        <p className="text-[10px] text-muted-foreground">Answers use your profile and strategy</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {messages.length > 0 && !isSending && (
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Clear conversation"
                            title="Clear conversation"
                            onClick={async () => {
                                const res = await ShieldIQApi.clearChatHistory();
                                if (res?.success) {
                                    setMessages([]);
                                    setSuggestions(STARTERS);
                                } else {
                                    setError('Could not clear the conversation. Please try again.');
                                }
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close chat">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4" aria-live="polite">
                {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        Ask anything about protecting your household: life and health cover, loans, emergency funds, or the numbers on any screen.
                    </p>
                )}
                {messages.map((m, i) => m.content && (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-muted text-foreground'}`}
                        >
                            {m.role === 'assistant' ? visibleAnswer(m.content) : m.content}
                        </div>
                    </div>
                ))}
                {isSending && !messages[messages.length - 1]?.content && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Thinking…
                    </div>
                )}
                {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
                <div ref={endRef} />
            </div>

            {suggestions.length > 0 && !isSending && (
                <div className="flex flex-wrap gap-2 border-t border-border px-5 pt-3">
                    {suggestions.map(s => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => send(s)}
                            className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-left text-[11px] font-medium hover:border-blue-500/50 hover:text-blue-600"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            <form
                onSubmit={e => {
                    e.preventDefault();
                    send(draft);
                }}
                className="flex items-end gap-2 px-5 py-4"
            >
                <label htmlFor="ask-shieldiq-input" className="sr-only">Your question</label>
                <textarea
                    id="ask-shieldiq-input"
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            send(draft);
                        }
                    }}
                    rows={2}
                    maxLength={2000}
                    placeholder="Ask a question…"
                    className="flex-1 resize-none rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button type="submit" size="icon" disabled={!draft.trim() || isSending} aria-label="Send" className="h-10 w-10 bg-blue-600 hover:bg-blue-700">
                    <Send className="h-4 w-4" />
                </Button>
            </form>
            <p className="px-5 pb-3 text-[9px] text-muted-foreground">
                Guidance from your profile, not regulated financial advice. Only anonymised figures are sent to the AI provider.
            </p>
        </div>
    );
};
