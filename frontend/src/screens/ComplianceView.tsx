import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, FileText, AlertTriangle, Database, Gavel, CheckCircle2, Printer, Calendar, ArrowLeft } from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/locales/en';

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
    <Card id={id} className="border-border shadow-sm p-8 space-y-4 scroll-mt-24">
        <h2 className="text-2xl font-black text-foreground tracking-tight">{title}</h2>
        {children}
    </Card>
);

export const ComplianceView: React.FC = () => {
    const { setCurrentScreen, user, setUser } = useApp();
    const { t, lang } = useI18n();

    const [activeSection, setActiveSection] = useState('intro');
    const [ackError, setAckError] = useState<string | null>(null);
    const hasAcknowledged = user.isLoggedIn && user.disclaimerAcknowledgedAt !== null;

    const acknowledge = async () => {
        const res = await ShieldIQApi.acknowledgeDisclaimer();
        if (res?.success && res.user) {
            setUser({ ...res.user, isLoggedIn: true });
            setAckError(null);
        } else {
            setAckError(t('comp.ackError'));
        }
    };

    const sections: { id: string; title: MessageKey; icon: React.ElementType }[] = [
        { id: 'intro', title: 'comp.s1', icon: FileText },
        { id: 'sourcing', title: 'comp.s2', icon: Database },
        { id: 'limits', title: 'comp.s3', icon: AlertTriangle },
        { id: 'standards', title: 'comp.s4', icon: Shield },
        { id: 'liability', title: 'comp.s5', icon: Gavel },
    ];
    const p = "text-sm text-muted-foreground leading-relaxed";

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 text-foreground font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-border">
                <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('comp.eyebrow')}</p>
                    <h1 className="text-4xl font-black tracking-tight text-foreground">{t('comp.title')}</h1>
                    <p className="text-muted-foreground text-sm font-medium">{t('comp.subtitle')}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                        <Calendar className="w-3.5 h-3.5" /> {t('comp.effective')}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" onClick={() => window.print()} className="font-bold border-border">
                        <Printer className="w-4 h-4 mr-2" /> {t('comp.print')}
                    </Button>
                    <Button variant="outline" onClick={() => setCurrentScreen('dashboard')} className="font-bold border-border">
                        <ArrowLeft className="w-4 h-4 mr-2" /> {t('comp.dashboard')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <aside className="lg:col-span-4 lg:sticky top-24 space-y-4">
                    <Card className="border-border shadow-sm p-6 space-y-4">
                        <h3 className="text-xs font-bold tracking-widest text-muted-foreground">{t('comp.toc')}</h3>
                        <nav className="space-y-1">
                            {sections.map(s => {
                                const Icon = s.icon;
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                            setActiveSection(s.id);
                                            document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${activeSection === s.id
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" />
                                        <span>{t(s.title)}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </Card>

                    <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 p-5 space-y-2">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4 shrink-0" /> {t('comp.noticeTitle')}
                        </div>
                        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">{t('comp.noticeBody')}</p>
                    </Card>
                </aside>

                <div className="lg:col-span-8 space-y-8">
                    <Section id="intro" title={t('comp.introTitle')}>
                        <p className={p}>{t('comp.intro1')}</p>
                        <p className={p}>{t('comp.intro2')}</p>
                    </Section>

                    <Section id="sourcing" title={t('comp.sourcingTitle')}>
                        <p className={p}>{t('comp.sourcingBody')}</p>
                        <ul className="space-y-2 text-sm text-muted-foreground bg-muted/30 p-4 rounded-xl border border-border list-disc pl-8">
                            {(['comp.f1', 'comp.f2', 'comp.f3', 'comp.f4', 'comp.f5'] as const).map(k => <li key={k}>{t(k)}</li>)}
                        </ul>
                    </Section>

                    <Section id="limits" title={t('comp.limitsTitle')}>
                        <p className={p}>{t('comp.limitsBody')}</p>
                        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-1 text-sm">
                            <p className="font-bold text-foreground">{t('comp.underwritingTitle')}</p>
                            <p className="text-muted-foreground">{t('comp.underwritingBody')}</p>
                        </div>
                    </Section>

                    <Section id="standards" title={t('comp.dataTitle')}>
                        <p className={p}>{t('comp.dataBody')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                            {([['comp.data1Title', 'comp.data1Body'], ['comp.data2Title', 'comp.data2Body'], ['comp.data3Title', 'comp.data3Body']] as const).map(([title, body]) => (
                                <div key={title} className="p-4 rounded-xl border border-border bg-card space-y-1">
                                    <p className="font-black text-foreground text-sm">{t(title)}</p>
                                    <p className="text-xs text-muted-foreground">{t(body)}</p>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section id="liability" title={t('comp.respTitle')}>
                        <p className={p}>{t('comp.respBody')}</p>
                    </Section>

                    <Card className="border-2 border-blue-500/30 bg-card p-8 space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-foreground">{t('comp.endTitle')}</h3>
                                <p className="text-sm text-muted-foreground">{t('comp.endBody')}</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                            <span className="text-xs font-bold text-muted-foreground">
                                {t('comp.status')}{' '}
                                {hasAcknowledged
                                    ? <span className="text-emerald-700 dark:text-emerald-400 font-black">{t('comp.acknowledged')}</span>
                                    : <span className="text-amber-700 dark:text-amber-400 font-black">{t('comp.pending')}</span>}
                            </span>
                            <Button
                                onClick={acknowledge}
                                disabled={hasAcknowledged || !user.isLoggedIn}
                                className={`font-bold px-8 ${hasAcknowledged ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                            >
                                {hasAcknowledged ? <><CheckCircle2 className="w-4 h-4 mr-2" />{t('comp.accepted')}</> : t('comp.accept')}
                            </Button>
                        </div>
                        {hasAcknowledged && (
                            <p className="text-xs text-muted-foreground">
                                {t('comp.acceptedOn', { date: new Date(user.disclaimerAcknowledgedAt!).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) })}
                            </p>
                        )}
                        {!user.isLoggedIn && <p className="text-xs text-muted-foreground">{t('comp.signInToAck')}</p>}
                        {ackError && <p role="alert" className="text-xs text-red-600 font-bold">{ackError}</p>}
                    </Card>
                </div>
            </div>
        </div>
    );
};
