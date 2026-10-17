import React, { useState } from 'react';
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    User,
    Shield,
    Key,
    CheckCircle2,
    Globe,
    Smartphone,
    Save,
    RotateCcw,
    AlertTriangle
} from "lucide-react";
import { useApp } from '@/lib/AppContext';
import { ShieldIQApi, CITY_TIERS, type CityTier } from '@/lib/api';
import { providerLabel } from '@/lib/utils';
import { householdOf } from '@/lib/household';

export const SettingsView: React.FC = () => {
    const { user, updateUserProfile, setCurrentScreen, logout, aiProvider } = useApp();

    const [activeTab, setActiveTab] = useState<'profile' | 'regional' | 'security'>('profile');
    const [saveResult, setSaveResult] = useState<{ ok: boolean; text: string } | null>(null);

    // Form fields
    const [name, setName] = useState(user.name);
    const [income, setIncome] = useState(user.income);
    const [occupation, setOccupation] = useState(user.occupation);
    const [city, setCity] = useState(user.city);
    const [age, setAge] = useState(user.age);
    const [maritalStatus, setMaritalStatus] = useState(user.maritalStatus);
    const [cityTier, setCityTier] = useState<CityTier>(user.cityTier);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [dataMessage, setDataMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const error = await updateUserProfile({
            name,
            income: Number(income),
            occupation,
            city,
            age: Number(age),
            maritalStatus,
            cityTier,
        });
        setSaveResult(error ? { ok: false, text: error } : { ok: true, text: 'Profile saved. Your strategy has been recalculated.' });
    };

    const household = householdOf(user);
    const dependentSummary = household.count === 0
        ? 'None'
        : [
            household.count - household.children.length - household.parents.length - household.siblings.length > 0 && 'spouse',
            household.children.length && `${household.children.length} ${household.children.length === 1 ? 'child' : 'children'}`,
            household.parents.length && `${household.parents.length} ${household.parents.length === 1 ? 'parent' : 'parents'}`,
            household.siblings.length && `${household.siblings.length} ${household.siblings.length === 1 ? 'sibling' : 'siblings'}`,
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
            setPasswordMessage({ ok: false, text: 'New password must be at least 8 characters.' });
            return;
        }
        const res = await ShieldIQApi.changePassword(currentPassword, newPassword);
        if (res && res.success) {
            setCurrentPassword('');
            setNewPassword('');
            setPasswordMessage({ ok: true, text: 'Password updated. Other sessions have been signed out.' });
        } else {
            setPasswordMessage({ ok: false, text: res?.error || 'Cannot reach the ShieldIQ server.' });
        }
    };

    const handleExport = async () => {
        const blob = await ShieldIQApi.exportData();
        if (!blob) {
            setDataMessage({ ok: false, text: 'Could not prepare your data. Please try again.' });
            return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `shieldiq-data-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        setDataMessage({ ok: true, text: 'Your data has been downloaded.' });
    };

    const handleDeleteAccount = async () => {
        const res = await ShieldIQApi.deleteAccount(deletePassword);
        if (res && res.success) {
            logout();
            return;
        }
        setDataMessage({ ok: false, text: res?.error || 'Cannot reach the ShieldIQ server.' });
    };

    const handleLogoutAll = async () => {
        await ShieldIQApi.logoutAll();
        logout();
    };

    return (
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 text-foreground font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-border">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                        <span>WORKSPACE PREFERENCES</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30 text-blue-600 bg-blue-50 dark:bg-blue-950/30">
                            Enterprise Config
                        </Badge>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground">Platform Settings</h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Manage your user identity, actuarial risk parameters, regional currency, and security posture.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentScreen('dashboard')}
                        className="font-bold border-border"
                    >
                        Back to Dashboard
                    </Button>
                </div>
            </div>

            {/* Saved Banner */}
            {saveResult && (
                <div role="status" className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in border ${saveResult.ok ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-400'}`}>
                    {saveResult.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" /> : <AlertTriangle className="w-5 h-5" />}
                    <span className="text-sm font-bold">{saveResult.text}</span>
                </div>
            )}

            {/* Settings Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-3 space-y-2">
                    {[
                        { id: 'profile', label: 'Personal Details', icon: User },
                        { id: 'regional', label: 'Regional & Baseline', icon: Globe },
                        { id: 'security', label: 'Security & Privacy', icon: Shield },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${isActive
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}

                    <div className="pt-6 border-t border-border mt-6 space-y-3">
                        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Signed In As</span>
                            <p className="text-xs font-bold text-foreground break-all">{user.email}</p>
                            <p className="text-[11px] text-muted-foreground">{user.onboardingCompleted ? 'Financial profile complete' : 'Financial profile incomplete'}</p>
                        </div>
                    </div>
                </div>

                {/* Form Panels */}
                <div className="lg:col-span-9">
                    <form onSubmit={handleSave} className="space-y-8">
                        {/* Tab 1: Personal Details */}
                        {activeTab === 'profile' && (
                            <Card className="border-border shadow-sm p-8 space-y-6">
                                <div>
                                    <CardTitle className="text-xl font-bold">Personal Profile & Identity</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
                                        These demographic variables govern baseline actuarial human life value projections.
                                    </CardDescription>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="settings-name" className="text-xs font-bold">Full Name</Label>
                                        <Input
                                            id="settings-name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="bg-muted/30 border-border"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="settings-email" className="text-xs font-bold">Email Address</Label>
                                        <Input
                                            id="settings-email"
                                            type="email"
                                            value={user.email}
                                            readOnly
                                            aria-describedby="settings-email-note"
                                            className="bg-muted/60 border-border text-muted-foreground"
                                        />
                                        <p id="settings-email-note" className="text-[10px] text-muted-foreground">Your sign-in ID; it can't be changed here.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="settings-income" className="text-xs font-bold">Annual Gross Income</Label>
                                        <Input
                                            id="settings-income"
                                            type="number"
                                            value={income}
                                            onChange={(e) => setIncome(Number(e.target.value))}
                                            className="bg-muted/30 border-border font-mono"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold">Dependents</Label>
                                        <p className="h-10 flex items-center justify-between gap-2 px-3 rounded-md border border-border bg-muted/60 text-sm">
                                            <span>{dependentSummary}</span>
                                            <button type="button" onClick={() => setCurrentScreen('onboarding')} className="text-xs font-bold text-blue-600 hover:underline">Edit</button>
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="settings-occupation" className="text-xs font-bold">Occupation / Title</Label>
                                        <Input
                                            id="settings-occupation"
                                            value={occupation}
                                            onChange={(e) => setOccupation(e.target.value)}
                                            className="bg-muted/30 border-border"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="settings-city" className="text-xs font-bold">Primary Resident City</Label>
                                        <Input
                                            id="settings-city"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="bg-muted/30 border-border"
                                        />
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Tab 2: Regional & Baseline */}
                        {activeTab === 'regional' && (
                            <Card className="border-border shadow-sm p-8 space-y-6">
                                <div>
                                    <CardTitle className="text-xl font-bold">Regional Settings & Currency</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
                                        Age, family and city tier drive your cover and premium estimates.
                                    </CardDescription>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="settings-age" className="text-xs font-bold">Age</Label>
                                        <Input id="settings-age" type="number" min={18} max={100} value={age} onChange={(e) => setAge(Number(e.target.value))} className="bg-muted/30 border-border" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="settings-marital" className="text-xs font-bold">Marital Status</Label>
                                        <select id="settings-marital" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value as 'Single' | 'Married')} className="w-full h-10 rounded-md border border-border bg-muted/30 px-3 text-sm">
                                            <option value="Single">Single</option>
                                            <option value="Married">Married</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="settings-tier" className="text-xs font-bold">City Tier</Label>
                                        <select id="settings-tier" value={cityTier} onChange={(e) => setCityTier(e.target.value as CityTier)} className="w-full h-10 rounded-md border border-border bg-muted/30 px-3 text-sm">
                                            {CITY_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold">Currency</Label>
                                        <p className="h-10 flex items-center px-3 rounded-md border border-border bg-muted/60 text-sm text-muted-foreground">INR (₹) – all amounts</p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                            <Globe className="w-4 h-4 text-blue-600" />
                                            Loans, expenses & existing cover
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            City tier sets health-cost benchmarks. Update loans, expenses, existing cover and lifestyle risks in the financial profile.
                                        </p>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => setCurrentScreen('onboarding')} className="font-bold shrink-0">
                                        Edit Financial Profile
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {/* Tab 3: Security & Privacy */}
                        {activeTab === 'security' && (
                            <Card className="border-border shadow-sm p-8 space-y-6">
                                <div>
                                    <CardTitle className="text-xl font-bold">Security & Data Privacy</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
                                        Manage your password, active sessions, and privacy preferences.
                                    </CardDescription>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Key className="w-5 h-5 text-blue-600" />
                                            <div>
                                                <h4 className="text-sm font-bold text-foreground">Change Password</h4>
                                                <p className="text-xs text-muted-foreground">Changing your password signs out all other sessions.</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="current-password" className="text-xs font-bold">Current Password</Label>
                                                <Input
                                                    id="current-password"
                                                    type="password"
                                                    autoComplete="current-password"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="new-password" className="text-xs font-bold">New Password</Label>
                                                <Input
                                                    id="new-password"
                                                    type="password"
                                                    autoComplete="new-password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        {passwordMessage && (
                                            <p role="status" className={`text-xs font-medium ${passwordMessage.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                                                {passwordMessage.text}
                                            </p>
                                        )}
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleChangePassword}
                                            disabled={!currentPassword || !newPassword}
                                            className="text-xs font-bold"
                                        >
                                            Update Password
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                                        <div className="flex items-center gap-3">
                                            <Smartphone className="w-5 h-5 text-indigo-600" />
                                            <div>
                                                <h4 className="text-sm font-bold text-foreground">Active Sessions</h4>
                                                <p className="text-xs text-muted-foreground">Sign out of ShieldIQ on every device, including this one.</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" type="button" onClick={handleLogoutAll} className="text-xs font-bold">
                                            Sign Out Everywhere
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                                        <div>
                                            <h4 className="text-sm font-bold text-foreground">Two-Factor Authentication (MFA)</h4>
                                            <p className="text-xs text-muted-foreground">Authenticator app support is not available yet.</p>
                                        </div>
                                        <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-none font-bold text-xs">
                                            Not Enabled
                                        </Badge>
                                    </div>

                                    <div className="p-4 rounded-xl border border-border space-y-3">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What We Store</h4>
                                        <ul className="text-xs text-muted-foreground leading-relaxed space-y-1.5 list-disc pl-4">
                                            <li>Your account, financial profile and saved plans.</li>
                                            <li>A security log of sign-ins, failed sign-ins, password and profile changes, used to protect your account.</li>
                                            <li>
                                                {aiProvider
                                                    ? `When you generate an AI strategy, only anonymised figures (no name, email or city) are sent to ${providerLabel(aiProvider)}, with provider-side storage disabled.`
                                                    : 'AI strategy generation is not enabled on this server.'}
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="p-4 rounded-xl border border-border space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <h4 className="text-sm font-bold text-foreground">Your Data</h4>
                                                <p className="text-xs text-muted-foreground">Download a copy of everything ShieldIQ stores about you.</p>
                                            </div>
                                            <Button type="button" variant="outline" size="sm" onClick={handleExport} className="text-xs font-bold shrink-0">
                                                Download My Data
                                            </Button>
                                        </div>

                                        <div className="pt-4 border-t border-border space-y-3">
                                            <div>
                                                <h4 className="text-sm font-bold text-red-600">Delete My Account</h4>
                                                <p className="text-xs text-muted-foreground">
                                                    Permanently erases your profile, saved plans and AI history. This cannot be undone.
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="delete-password" className="text-xs font-bold">Your Password</Label>
                                                    <Input id="delete-password" type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="delete-confirm" className="text-xs font-bold">Type DELETE to confirm</Label>
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
                                                Delete My Account Permanently
                                            </Button>
                                        </div>
                                        {dataMessage && (
                                            <p role="status" className={`text-xs font-medium ${dataMessage.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>{dataMessage.text}</p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Submit Button */}
                        <div className="flex items-center justify-end gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetForm}
                                className="font-bold border-border"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reset
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
