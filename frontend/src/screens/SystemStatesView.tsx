import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {  } from "@/components/ui/badge";
import {
    Loader2,
    AlertCircle,
    SearchX,
    Settings2,
    ShieldAlert
} from "lucide-react";
import { useApp } from '@/lib/AppContext';

export interface SystemStateProps {
    type?: "loading" | "error" | "empty" | "maintenance";
    title?: string;
    description?: string;
    onAction?: () => void;
}

export const SystemStatesView: React.FC<SystemStateProps> = ({
    type: propType,
    title,
    description,
    onAction
}) => {
    const { setCurrentScreen } = useApp();
    const [selectedType, setSelectedType] = useState<"loading" | "error" | "empty" | "maintenance">(
        propType || "maintenance"
    );

    const activeType = propType || selectedType;

    const states = {
        loading: {
            icon: Loader2,
            title: title || "Processing Actuarial Data",
            description: description || "Initializing neural risk simulation models. This usually takes a few seconds.",
            actionLabel: "Cancel Operation",
            iconColor: "text-blue-600 animate-spin"
        },
        error: {
            icon: AlertCircle,
            title: title || "Model Calculation Failure",
            description: description || "We encountered an inconsistency in the provided data logs. Our team has been notified.",
            actionLabel: "Try Again",
            iconColor: "text-red-500"
        },
        empty: {
            icon: SearchX,
            title: title || "No Records Found",
            description: description || "No insurance policies or historical logs detected for this entity.",
            actionLabel: "Initialize Profile",
            iconColor: "text-slate-400"
        },
        maintenance: {
            icon: Settings2,
            title: title || "Periodic Model Calibration",
            description: description || "The ShieldIQ engine is currently undergoing regulatory compliance updates. Expected uptime: 2 hours.",
            actionLabel: "Check Health Status",
            iconColor: "text-amber-500"
        }
    };

    const state = states[activeType];
    const Icon = state.icon;

    const handleActionClick = () => {
        if (onAction) {
            onAction();
        } else if (activeType === 'empty') {
            setCurrentScreen('onboarding');
        } else {
            setCurrentScreen('dashboard');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 font-sans">
            {/* Interactive State Switcher (when rendered standalone) */}
            {!propType && (
                <div className="mb-8 p-1.5 rounded-2xl bg-muted border border-border flex items-center gap-1 shadow-sm">
                    {(['loading', 'error', 'empty', 'maintenance'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setSelectedType(t)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${selectedType === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            )}

            <Card className="max-w-md w-full p-12 text-center space-y-8 border-border shadow-2xl bg-card overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600/10">
                    <div className={`h-full bg-blue-600 transition-all duration-1000 ${activeType === 'loading' ? 'w-1/2 animate-pulse' : 'w-full'}`} />
                </div>

                <div className="flex justify-center">
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                        <Icon className={`w-12 h-12 ${state.iconColor}`} />
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">{state.title}</h1>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed uppercase tracking-wider">
                        {state.description}
                    </p>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <Button
                        onClick={handleActionClick}
                        className="w-full bg-blue-600 hover:bg-blue-700 py-6 font-black uppercase tracking-widest text-[10px]"
                    >
                        {state.actionLabel}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => setCurrentScreen('dashboard')}
                        className="w-full font-black uppercase tracking-widest text-[10px] text-muted-foreground hover:text-foreground"
                    >
                        Return to Safe Zone
                    </Button>
                </div>

                <div className="pt-4 flex items-center justify-center gap-2 opacity-50">
                    <ShieldAlert className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.4em]">
                        ShieldIQ Integrity Protection
                    </span>
                </div>
            </Card>
        </div>
    );
};
