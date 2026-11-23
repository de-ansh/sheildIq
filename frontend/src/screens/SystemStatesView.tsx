import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

/** Reports the backend's real health. */
export const SystemStatesView: React.FC = () => {
    const { setCurrentScreen } = useApp();
    const { t, lang } = useI18n();
    const [health, setHealth] = useState<{ status: string; version?: string; timestamp?: string } | null | undefined>(undefined);

    useEffect(() => {
        ShieldIQApi.getHealth().then(res => setHealth(res ?? null));
    }, []);

    const up = health?.status === 'UP';
    const { Icon, iconColor, title, description } = health === undefined
        ? { Icon: Loader2, iconColor: 'text-blue-600 animate-spin', title: t('status.checking'), description: t('status.checkingBody') }
        : up
            ? {
                Icon: CheckCircle2, iconColor: 'text-emerald-700 dark:text-emerald-400', title: t('status.up'),
                description: t('status.upBody', { version: health?.version ?? '', time: health?.timestamp ? new Date(health.timestamp).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN') : '' }),
            }
            : {
                Icon: AlertCircle, iconColor: 'text-red-500', title: t('status.down'),
                description: t('status.downBody'),
            };

    return (
        <div className="flex flex-col items-center px-6 py-24 text-foreground font-sans">
            <Card className="max-w-md w-full p-12 text-center space-y-6 border-border shadow-2xl bg-card">
                <div className="flex justify-center">
                    <Icon className={`w-12 h-12 ${iconColor}`} />
                </div>
                <div className="space-y-3">
                    <h1 className="text-2xl font-black text-foreground tracking-tight">{title}</h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
                <Button onClick={() => setCurrentScreen('dashboard')} className="w-full bg-blue-600 hover:bg-blue-700 font-bold text-white">
                    {t('status.back')}
                </Button>
            </Card>
        </div>
    );
};
