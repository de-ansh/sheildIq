import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertCircle, Loader2 } from "lucide-react";
import { useApp } from '@/lib/AppContext';

export const LoginView: React.FC = () => {
    const { login, setCurrentScreen } = useApp();
    const [email, setEmail] = useState('alex.vance@shieldiq.internal');
    const [password, setPassword] = useState('password123');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim() || !email.includes('@')) {
            setError('Please enter a valid email address.');
            return;
        }

        setIsLoading(true);
        try {
            const displayName = email.split('@')[0].replace('.', ' ');
            const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
            await login(formattedName, email);
        } catch {
            setError('Authentication failed. Please check credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setIsLoading(true);
        try {
            await login('Alex Vance', 'alex.vance@shieldiq.internal');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
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
                        Risk-Intelligent Protection Planning
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
                                Email Address
                            </label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="bg-muted/30 border-border"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium leading-none text-foreground">
                                    Password
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setError('Password reset link has been dispatched to your email.')}
                                    className="text-xs text-blue-600 hover:underline bg-transparent border-0 p-0 cursor-pointer"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="bg-muted/30 border-border"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-semibold"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Authenticating...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </Button>
                    </form>

                    <div className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleDemoLogin}
                            disabled={isLoading}
                            className="w-full font-semibold border-slate-200 dark:border-slate-800 text-xs text-muted-foreground hover:text-foreground"
                        >
                            One-Click Demo Sign-In (Alex Vance)
                        </Button>
                    </div>

                    <div className="text-center mt-6">
                        <p className="text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <button
                                type="button"
                                onClick={() => setCurrentScreen('onboarding')}
                                className="text-blue-600 font-semibold hover:underline bg-transparent border-0 p-0 cursor-pointer"
                            >
                                Sign Up
                            </button>
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="fixed bottom-8 text-center w-full px-4">
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest leading-relaxed max-w-lg mx-auto">
                    This platform provides analytical insights and does not constitute insurance advisory.
                    © 2026 ShieldIQ Technologies. All rights reserved.
                </p>
            </div>
        </div>
    );
};
