import React, { useState } from 'react';
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Shield, Key, CheckCircle2, Globe, Smartphone, Save, RotateCcw, AlertTriangle } from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi, CITY_TIERS, type CityTier } from '@/lib/api';
import { providerLabel } from '@/lib/utils';
import { householdOf } from '@/lib/household';
import { useI18n } from '@/lib/i18n';

type Message = { ok: boolean; text: string } | null;

const Status: React.FC<{ message: Message }> = ({ message }) => message && (
    <p role="status" className={`text-xs font-medium ${message.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>{message.text}</p>
);

export const SettingsView: React.FC = () => {
    const { user, updateUserProfile, setCurrentScreen, logout, aiProvider } = useApp();
    const { t, tServer } = useI18n();

    const [activeTab, setActiveTab] = useState<'profile' | 'regional' | 'security'>('profile');
    const [saveResult, setSaveResult] = useState<Message>(null);

    const [name, setName] = useState(user.name);
    const [income, setIncome] = useState(user.income);
    const [occupation, setOccupation] = useState(user.occupation);
    const [city, setCity] = useState(user.city);
    const [age, setAge] = useState(user.age);
    const [maritalStatus, setMaritalStatus] = useState(user.maritalStatus);
    const [cityTier, setCityTier] = useState<CityTier>(user.cityTier);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [dataMessage, setDataMessage] = useState<Message>(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState<Message>(null);

    const unreachable = t('common.serverUnreachable');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const error = await updateUserProfile({ name, income: Number(income), occupation, city, age: Number(age), maritalStatus, cityTier });
        setSaveResult(error ? { ok: false, text: tServer(error) ?? error } : { ok: true, text: t('set.saved') });
    };

    const household = householdOf(user);
    const count = (n: number, one: Parameters<typeof t>[0], many: Parameters<typeof t>[0]) => n > 0 && (n === 1 ? t(one) : t(many, { count: n }));
    const dependentSummary = household.count === 0
        ? t('set.depNone')
        : [
            household.count - household.children.length - household.parents.length - household.siblings.length > 0 && t('set.depSpouse'),
            count(household.children.length, 'set.depChild', 'set.depChildren'),
            count(household.parents.length, 'set.depParent', 'set.depParents'),
            count(household.siblings.length, 'set.depSibling', 'set.depSiblings'),
        ].filter(Boolean).join(', ');

    const resetForm = () => {
        setName(user.name);
        setIncome(user.income);
        setOccupation(user.occupation);
        setCity(user.city);
        setAge(user.age);
        setMaritalStatus(user.maritalStatus);
        setCityTier(user.cityTier);
        setSaveResult(null);
    };

    const handleChangePassword = async () => {
        if (newPassword.length < 8) {
            setPasswordMessage({ ok: false, text: t('set.pwTooShort') });
            return;
        }
        const res = await ShieldIQApi.changePassword(currentPassword, newPassword);
        if (res && res.success) {
            setCurrentPassword('');
            setNewPassword('');
            setPasswordMessage({ ok: true, text: t('set.pwUpdated') });
        } else {
            setPasswordMessage({ ok: false, text: tServer(res?.error) ?? unreachable });
        }
    };

    const handleExport = async () => {
        const blob = await ShieldIQApi.exportData();
        if (!blob) {
            setDataMessage({ ok: false, text: t('set.downloadError') });
            return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `shieldiq-data-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        setDataMessage({ ok: true, text: t('set.downloaded') });
    };

    const handleDeleteAccount = async () => {
        const res = await ShieldIQApi.deleteAccount(deletePassword);
        if (res && res.success) {
            logout();
            return;
        }
        setDataMessage({ ok: false, text: tServer(res?.error) ?? unreachable });
    };

    const handleLogoutAll = async () => {
        await ShieldIQApi.logoutAll();
        logout();
    };

    const field = "bg-muted/30 border-border";
    const select = "w-full h-10 rounded-md border border-border bg-muted/30 px-3 text-sm";

    return (
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 text-foreground font-sans">
            <div className="space-y-1 pb-6 border-b border-border">
                <h1 className="text-4xl font-black tracking-tight text-foreground">{t('set.title')}</h1>
                <p className="text-muted-foreground text-sm font-medium">{t('set.subtitle')}</p>
            </div>

            {saveResult && (
                <div role="status" className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in border ${saveResult.ok ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-400'}`}>
                    {saveResult.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" /> : <AlertTriangle className="w-5 h-5" />}
                    <span className="text-sm font-bold">{saveResult.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-3 space-y-2">
                    {([
                        { id: 'profile', label: t('set.tabProfile'), icon: User },
                        { id: 'regional', label: t('set.tabRegional'), icon: Globe },
                        { id: 'security', label: t('set.tabSecurity'), icon: Shield },
                    ] as const).map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                aria-current={activeTab === tab.id ? 'page' : undefined}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}

                    <div className="mt-6 pt-6 border-t border-border">
                        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
                            <p className="text-xs font-bold text-muted-foreground">{t('set.signedInAs')}</p>
                            <p className="text-xs font-bold text-foreground break-all">{user.email}</p>
                            <p className="text-xs text-muted-foreground">{t(user.onboardingCompleted ? 'set.profileComplete' : 'set.profileIncomplete')}</p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-9">
                    <form onSubmit={handleSave} className="space-y-8">
                        {activeTab === 'profile' && (
                            <Card className="border-border shadow-sm p-8 space-y-6">
                                <div>
                                    <CardTitle className="text-xl font-bold">{t('set.profileTitle')}</CardTitle>
                                    <CardDescription className="text-sm text-muted-foreground">{t('set.profileSub')}</CardDescription>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="settings-name" className="text-xs font-bold">{t('set.name')}</Label>
                                        <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} className={field} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="settings-email" className="text-xs font-bold">{t('set.email')}</Label>
                                        <Input id="settings-email" type="email" value={user.email} readOnly aria-describedby="settings-email-note" className="bg-muted/60 border-border text-muted-foreground" />
                                        <p id="settings-email-note" className="text-xs text-muted-foreground">{t('set.emailNote')}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="settings-income" className="text-xs font-bold">{t('set.income')}</Label>
                                        <Input id="settings-income" type="number" value={income} onChange={(e) => setIncome(Number(e.target.value))} className={`${field} font-mono`} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold">{t('set.dependents')}</Label>
                                        <p className="h-10 flex items-center justify-between gap-2 px-3 rounded-md border border-border bg-muted/60 text-sm">
                                            <span>{dependentSummary}</span>
                                            <button type="button" onClick={() => setCurrentScreen('onboarding')} className="text-xs font-bold text-blue-600 hover:underline">{t('set.edit')}</button>
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="settings-occupation" className="text-xs font-bold">{t('set.occupation')}</Label>
                                        <Input id="settings-occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} className={field} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="settings-city" className="text-xs font-bold">{t('set.city')}</Label>
                                        <Input id="settings-city" value={city} onChange={(e) => setCity(e.target.value)} className={field} />
                                    </div>
                                </div>
                            </Card>
                        )}

                        {activeTab === 'regional' && (
                            <Card className="border-border shadow-sm p-8 space-y-6">
                                <div>
                                    <CardTitle className="text-xl font-bold">{t('set.regionalTitle')}</CardTitle>
                                    <CardDescription className="text-sm text-muted-foreground">{t('set.regionalSub')}</CardDescription>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="settings-age" className="text-xs font-bold">{t('set.age')}</Label>
                                        <Input id="settings-age" type="number" min={18} max={100} value={age} onChange={(e) => setAge(Number(e.target.value))} className={field} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="settings-marital" className="text-xs font-bold">{t('set.marital')}</Label>
                                        <select id="settings-marital" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value as 'Single' | 'Married')} className={select}>
                                            <option value="Single">{t('marital.Single')}</option>
                                            <option value="Married">{t('marital.Married')}</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="settings-tier" className="text-xs font-bold">{t('set.cityTier')}</Label>
                                        <select id="settings-tier" value={cityTier} onChange={(e) => setCityTier(e.target.value as CityTier)} className={select}>
                                            {CITY_TIERS.map(tier => <option key={tier} value={tier}>{t(`tier.${tier}`)}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-foreground">{t('set.moreTitle')}</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{t('set.moreBody')}</p>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => setCurrentScreen('onboarding')} className="font-bold shrink-0">
                                        {t('set.editProfile')}
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {activeTab === 'security' && (
                            <Card className="border-border shadow-sm p-8 space-y-6">
                                <div>
                                    <CardTitle className="text-xl font-bold">{t('set.securityTitle')}</CardTitle>
                                    <CardDescription className="text-sm text-muted-foreground">{t('set.securitySub')}</CardDescription>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Key className="w-5 h-5 text-blue-600" />
                                            <div>
                                                <h2 className="text-sm font-bold text-foreground">{t('set.pwTitle')}</h2>
                                                <p className="text-xs text-muted-foreground">{t('set.pwSub')}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="current-password" className="text-xs font-bold">{t('set.pwCurrent')}</Label>
                                                <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="new-password" className="text-xs font-bold">{t('set.pwNew')}</Label>
                                                <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                            </div>
                                        </div>
                                        <Status message={passwordMessage} />
                                        <Button type="button" size="sm" onClick={handleChangePassword} disabled={!currentPassword || !newPassword} className="text-xs font-bold">
                                            {t('set.pwButton')}
                                        </Button>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-muted/20">
                                        <div className="flex items-center gap-3">
                                            <Smartphone className="w-5 h-5 text-indigo-600" />
                                            <div>
                                                <h2 className="text-sm font-bold text-foreground">{t('set.sessionsTitle')}</h2>
                                                <p className="text-xs text-muted-foreground">{t('set.sessionsSub')}</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" type="button" onClick={handleLogoutAll} className="text-xs font-bold shrink-0">
                                            {t('set.signOutAll')}
                                        </Button>
                                    </div>

                                    <div className="p-4 rounded-xl border border-border space-y-3">
                                        <h2 className="text-sm font-bold text-foreground">{t('set.storeTitle')}</h2>
                                        <ul className="text-xs text-muted-foreground leading-relaxed space-y-1.5 list-disc pl-4">
                                            <li>{t('set.store1')}</li>
                                            <li>{t('set.store2')}</li>
                                            <li>{aiProvider ? t('set.storeAi', { provider: providerLabel(aiProvider) }) : t('set.storeNoAi')}</li>
                                        </ul>
                                    </div>

                                    <div className="p-4 rounded-xl border border-border space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <h2 className="text-sm font-bold text-foreground">{t('set.dataTitle')}</h2>
                                                <p className="text-xs text-muted-foreground">{t('set.dataSub')}</p>
                                            </div>
                                            <Button type="button" variant="outline" size="sm" onClick={handleExport} className="text-xs font-bold shrink-0">
                                                {t('set.download')}
                                            </Button>
                                        </div>
                                        <div className="pt-4 border-t border-border space-y-3">
                                            <div>
                                                <h2 className="text-sm font-bold text-red-600">{t('set.deleteTitle')}</h2>
                                                <p className="text-xs text-muted-foreground">{t('set.deleteSub')}</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="delete-password" className="text-xs font-bold">{t('set.deletePassword')}</Label>
                                                    <Input id="delete-password" type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="delete-confirm" className="text-xs font-bold">{t('set.deleteConfirm')}</Label>
                                                    <Input id="delete-confirm" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} autoComplete="off" />
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={handleDeleteAccount}
                                                disabled={!deletePassword || deleteConfirm !== 'DELETE'}
                                                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                                            >
                                                {t('set.deleteButton')}
                                            </Button>
                                        </div>
                                        <Status message={dataMessage} />
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Save applies to the profile fields only, so the security tab has no Save button. */}
                        {activeTab !== 'security' && (
                            <div className="flex items-center justify-end gap-4 pt-4">
                                <Button type="button" variant="outline" onClick={resetForm} className="font-bold border-border">
                                    <RotateCcw className="w-4 h-4 mr-2" /> {t('set.reset')}
                                </Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8">
                                    <Save className="w-4 h-4 mr-2" /> {t('set.save')}
                                </Button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};
