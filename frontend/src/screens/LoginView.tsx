import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';

export const LoginView: React.FC = () => {
    const { login, register } = useApp();
    const { t, tServer, lang, setLang } = useI18n();
    // Reset links arrive as /?reset=<token>
    const [resetToken] = useState(() => new URLSearchParams(window.location.search).get('reset'));
    const [mode, setMode] = useState<Mode>(resetToken ? 'reset' : 'signin');
    const isSignUp = mode === 'signup';
    const [notice, setNotice] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setNotice(null);

        if (mode !== 'reset' && (!email.trim() || !email.includes('@'))) {
            setError(t('login.invalidEmail'));
            return;
        }

        if ((mode === 'signup' || mode === 'reset') && password.length < 8) {
            setError(t('login.passwordTooShort'));
            return;
        }

        setIsLoading(true);
        try {
            if (mode === 'forgot') {
                const res = await ShieldIQApi.forgotPassword(email);
                if (res && res.success) setNotice(tServer(res.message));
                else setError(tServer(res?.error) || t('common.serverUnreachable'));
            } else if (mode === 'reset') {
                const res = await ShieldIQApi.resetPassword(resetToken!, password);
                if (res && res.success) {
                    window.history.replaceState(null, '', window.location.pathname);
                    setPassword('');
                    setMode('signin');
                    setNotice(t('login.passwordUpdated'));
                } else {
                    setError(tServer(res?.error) || t('common.serverUnreachable'));
                }
            } else {
                setError(tServer(isSignUp ? await register(name.trim(), email, password) : await login(email, password)));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setError(null);
        setIsLoading(true);
        try {
            setError(tServer(await login('alex.vance@shieldiq.internal', 'Password123!')));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
            {/* Language can be chosen before signing in. The word is shown in its own script. */}
            <button
                type="button"
                onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
                title={t('language.switchAria')}
                lang={lang === 'en' ? 'hi' : 'en'}
                className="fixed top-4 right-4 h-9 rounded-full border border-border bg-card px-4 text-sm font-bold hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
                {t('language.switch')}
            </button>
            <Card className="w-full max-w-md shadow-lg border-border bg-card">
                <CardHeader className="space-y-1 text-center pb-8">
                    <div className="flex justify-center mb-4">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                        ShieldIQ
                    </CardTitle>
                    <p className="text-sm text-muted-foreground font-medium">
                        {t('login.tagline')}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {notice && (
                        <div role="status" className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-lg flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{notice}</span>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignUp && (
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium leading-none text-foreground">
                                    {t('login.fullName')}
                                </label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Jane Doe"
                                    className="bg-muted/30 border-border"
                                    autoComplete="name"
                                    required
                                />
                            </div>
                        )}
                        {mode !== 'reset' && (
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
                                {t('login.email')}
                            </label>
                            <Input
                                id="email"
                                autoComplete="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="bg-muted/30 border-border"
                                required
                            />
                        </div>
                        )}
                        {mode !== 'forgot' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="text-sm font-medium leading-none text-foreground">
                                    {mode === 'reset' ? t('login.newPassword') : t('login.password')}
                                </label>
                                {mode === 'signin' && (
                                <button
                                    type="button"
                                    onClick={() => { setMode('forgot'); setError(null); setNotice(null); }}
                                    className="text-xs text-blue-600 hover:underline bg-transparent border-0 p-0 cursor-pointer"
                                >
                                    {t('login.forgot')}
                                </button>
                                )}
                            </div>
                            <Input
                                id="password"
                                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="bg-muted/30 border-border"
                                required
                            />
                        </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-semibold"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {mode === 'signin' || mode === 'signup' ? t('login.authenticating') : t('login.submitting')}
                                </span>
                            ) : (
                                t(({ signin: 'login.signIn', signup: 'login.createAccount', forgot: 'login.sendReset', reset: 'login.setNewPassword' } as const)[mode])
                            )}
                        </Button>
                    </form>

                    {/* Demo account is not seeded in production builds */}
                    {!import.meta.env.PROD && mode === 'signin' && (
                    <div className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleDemoLogin}
                            disabled={isLoading}
                            className="w-full font-semibold border-slate-200 dark:border-slate-800 text-xs text-muted-foreground hover:text-foreground"
                        >
                            {t('login.demo')}
                        </Button>
                    </div>
                    )}

                    <div className="text-center mt-6">
                        <p className="text-sm text-muted-foreground">
                            {mode === 'signin' ? t('login.noAccount') : t('login.haveAccount')}{' '}
                            <button
                                type="button"
                                onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setNotice(null); }}
                                className="text-blue-600 font-semibold hover:underline bg-transparent border-0 p-0 cursor-pointer"
                            >
                                {mode === 'signin' ? t('login.signUp') : t('login.signIn')}
                            </button>
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="fixed bottom-8 text-center w-full px-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed max-w-lg mx-auto">
                    {t('login.footer')}
                </p>
            </div>
        </div>
    );
};
