import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export const LoginView: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
            {/* Background patterns if any from original design could be added here */}

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
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
                            Email Address
                        </label>
                        <Input
                            type="email"
                            placeholder="name@company.com"
                            className="bg-muted/30 border-border"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium leading-none text-foreground">
                                Password
                            </label>
                            <a href="#" className="text-xs text-blue-600 hover:underline">
                                Forgot Password?
                            </a>
                        </div>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            className="bg-muted/30 border-border"
                        />
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-semibold">
                        Sign In
                    </Button>

                    <div className="text-center mt-6">
                        <p className="text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <a href="#" className="text-blue-600 font-semibold hover:underline">
                                Sign Up
                            </a>
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
