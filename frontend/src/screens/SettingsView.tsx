import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    User,
    Shield,
    DollarSign,
    Lock,
    Key,
    CheckCircle2,
    Globe,
    Smartphone,
    Save,
    RotateCcw,
    AlertTriangle,
    Eye,
    Bell
} from "lucide-react";
import { useApp } from '@/lib/AppContext';

export const SettingsView: React.FC = () => {
    const { user, updateUserProfile, setCurrentScreen } = useApp();

    const [activeTab, setActiveTab] = useState<'profile' | 'regional' | 'security'>('profile');
    const [savedNotification, setSavedNotification] = useState(false);

    // Form fields
    const [name, setName] = useState(user?.name || 'Alex Vance');
    const [email, setEmail] = useState(user?.email || 'alex.vance@shieldiq.internal');
    const [income, setIncome] = useState(user?.income || 145000);
    const [dependents, setDependents] = useState(user?.dependents ?? 2);
    const [occupation, setOccupation] = useState(user?.occupation || 'Senior Systems Architect');
    const [city, setCity] = useState(user?.city || 'San Francisco, CA');
    const [currency, setCurrency] = useState('USD');
    const [mfaEnabled, setMfaEnabled] = useState(true);
    const [sessionLogging, setSessionLogging] = useState(true);
    const [modelTraining, setModelTraining] = useState(false);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        updateUserProfile({
            name,
            email,
            income: Number(income),
            dependents: Number(dependents),
            occupation,
            city,
        });

        setSavedNotification(true);
        setTimeout(() => setSavedNotification(false), 3000);
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
            {savedNotification && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm font-bold">Preferences saved successfully across all active models.</span>
                    </div>
                    <Badge className="bg-emerald-600 text-white border-none text-[10px]">Updated</Badge>
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
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pro Account</span>
                            <p className="text-xs font-bold text-foreground">Verified Enterprise Tier</p>
                            <p className="text-[11px] text-muted-foreground">Full unconstrained actuarial calculation engines unlocked.</p>
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
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="bg-muted/30 border-border"
                                            required
                                        />
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
                                        <Label htmlFor="settings-dependents" className="text-xs font-bold">Immediate Dependents</Label>
                                        <Input
                                            id="settings-dependents"
                                            type="number"
                                            min={0}
                                            max={10}
                                            value={dependents}
                                            onChange={(e) => setDependents(Number(e.target.value))}
                                            className="bg-muted/30 border-border font-mono"
                                            required
                                        />
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
                                        Configure display currency and localized inflation benchmarks.
                                    </CardDescription>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="settings-currency" className="text-xs font-bold">Primary Currency</Label>
                                        <select
                                            id="settings-currency"
                                            value={currency}
                                            onChange={(e) => setCurrency(e.target.value)}
                                            className="flex h-10 w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-medium"
                                        >
                                            <option value="USD">USD ($) - United States Dollar</option>
                                            <option value="INR">INR (₹) - Indian Rupee</option>
                                            <option value="EUR">EUR (€) - Eurozone</option>
                                            <option value="GBP">GBP (£) - British Pound</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="settings-timezone" className="text-xs font-bold">Reporting Timezone</Label>
                                        <select
                                            id="settings-timezone"
                                            defaultValue="GMT-08:00"
                                            className="flex h-10 w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-medium"
                                        >
                                            <option value="GMT-08:00">(GMT-08:00) Pacific Time</option>
                                            <option value="GMT-05:00">(GMT-05:00) Eastern Time</option>
                                            <option value="GMT+05:30">(GMT+05:30) India Standard Time</option>
                                            <option value="GMT+00:00">(GMT+00:00) London</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                        <Globe className="w-4 h-4 text-blue-600" />
                                        Actuarial Regional Calibration
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Medical inflation and mortality tables are dynamically calibrated based on your selected region and demographic tier.
                                    </p>
                                </div>
                            </Card>
                        )}

                        {/* Tab 3: Security & Privacy */}
                        {activeTab === 'security' && (
                            <Card className="border-border shadow-sm p-8 space-y-6">
                                <div>
                                    <CardTitle className="text-xl font-bold">Security & Data Privacy</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
                                        Manage multi-factor authentication, technical logging, and GDPR/CCPA data export preferences.
                                    </CardDescription>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                                        <div className="flex items-center gap-3">
                                            <Key className="w-5 h-5 text-blue-600" />
                                            <div>
                                                <h4 className="text-sm font-bold text-foreground">Two-Factor Authentication (MFA)</h4>
                                                <p className="text-xs text-muted-foreground">TOTP Authenticator app active on current session.</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold text-xs">
                                            Active
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                                        <div className="flex items-center gap-3">
                                            <Smartphone className="w-5 h-5 text-indigo-600" />
                                            <div>
                                                <h4 className="text-sm font-bold text-foreground">Active Devices</h4>
                                                <p className="text-xs text-muted-foreground">2 Authorized devices connected in San Francisco, CA.</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" type="button" className="text-xs font-bold">
                                            Manage Devices
                                        </Button>
                                    </div>

                                    <div className="p-4 rounded-xl border border-border space-y-4">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Privacy Controls</h4>

                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                id="chk-session-logging"
                                                checked={sessionLogging}
                                                onCheckedChange={(c) => setSessionLogging(!!c)}
                                            />
                                            <Label htmlFor="chk-session-logging" className="text-xs font-medium cursor-pointer">
                                                Technical Session Logging (store timestamp & IP metadata for fraud prevention)
                                            </Label>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                id="chk-model-training"
                                                checked={modelTraining}
                                                onCheckedChange={(c) => setModelTraining(!!c)}
                                            />
                                            <Label htmlFor="chk-model-training" className="text-xs font-medium cursor-pointer">
                                                Allow anonymized telemetry for actuarial model accuracy calibration
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Submit Button */}
                        <div className="flex items-center justify-end gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setName(user?.name || 'Alex Vance');
                                    setEmail(user?.email || 'alex.vance@shieldiq.internal');
                                }}
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
