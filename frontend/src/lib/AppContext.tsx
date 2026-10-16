import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ShieldIQApi, type AiStrategy, type CityTier, type Strategy } from './api';
import type { Dependent } from './household';

export type ScreenId =
  | 'login'
  | 'onboarding'
  | 'dashboard'
  | 'calculator'
  | 'healthplanner'
  | 'analysis'
  | 'comparison'
  | 'simulator'
  | 'deepdive'
  | 'affordability'
  | 'dependencies'
  | 'savedplans'
  | 'settings'
  | 'compliance'
  | 'systemstates'
  | 'policyscan';

export interface UserProfile {
  name: string;
  email: string;
  age: number;
  income: number;
  dependents: number;
  maritalStatus: 'Single' | 'Married';
  city: string;
  cityTier: CityTier;
  occupation: string;
  homeLoan: number;
  otherLoans: number;
  monthlyExpenses: number;
  existingLifeCover: number;
  existingHealthCover: number;
  liquidSavings: number;
  spouseIncome: number;
  dependentDetails: Dependent[];
  parentsHealthCover: number;
  loanEmi: number;
  homeLoanYearsLeft: number;
  existingCiCover: number;
  existingPaCover: number;
  employerBenefits: string[];
  lifestyleRisks: string[];
  onboardingCompleted: boolean;
  /** ISO time the financial profile was last saved; '' when unknown. */
  profileReviewedAt: string;
  disclaimerAcknowledgedAt: string | null;
  isLoggedIn: boolean;
}

export type ProfileUpdate = Partial<Omit<UserProfile, 'email' | 'isLoggedIn' | 'onboardingCompleted' | 'profileReviewedAt' | 'disclaimerAcknowledgedAt'>>;

export interface Policy {
  id: string;
  title: string;
  provider: string;
  category: 'Life' | 'Health' | 'Critical Illness' | 'Personal Accident';
  coverageAmount: number;
  monthlyPremium: number;
  status: 'Available';
  clarityScore?: number;
  features?: string[];
  exclusions?: string[];
  structure?: string;
  waitingPeriod?: string;
  bestFor?: string;
}

interface AppContextType {
  currentScreen: ScreenId;
  setCurrentScreen: (screen: ScreenId) => void;
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  policies: Policy[];
  isBackendConnected: boolean;
  selectedPolicyId: string | null;
  setSelectedPolicyId: (id: string | null) => void;
  /** Resolves to an error message, or null on success. */
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  logout: () => void;
  /** Resolves to an error message, or null on success. */
  submitOnboarding: (data: ProfileUpdate) => Promise<string | null>;
  /** Resolves to an error message, or null on success. */
  updateUserProfile: (data: ProfileUpdate) => Promise<string | null>;
  /** Computed from the stored profile by the backend; null until loaded or before onboarding. */
  strategy: Strategy | null;
  aiStrategy: AiStrategy | null;
  aiProvider: string | null;
  isGeneratingAi: boolean;
  aiError: string | null;
  generateAiStrategy: (refresh?: boolean) => Promise<void>;
}

// Mirrors the seeded demo account; replaced by the real profile as soon as a session loads.
const defaultUser: UserProfile = {
  name: 'Alex Vance',
  email: 'alex.vance@shieldiq.internal',
  age: 34,
  income: 2400000,
  dependents: 2,
  maritalStatus: 'Married',
  city: 'Bengaluru, KA',
  cityTier: 'Tier 1 (Metro)',
  occupation: 'Senior Systems Architect',
  homeLoan: 4500000,
  otherLoans: 500000,
  monthlyExpenses: 85000,
  existingLifeCover: 15000000,
  existingHealthCover: 500000,
  liquidSavings: 1000000,
  spouseIncome: 0,
  dependentDetails: [],
  parentsHealthCover: 0,
  loanEmi: 45000,
  homeLoanYearsLeft: 15,
  existingCiCover: 0,
  existingPaCover: 0,
  employerBenefits: ['Group Term Life', 'OPD Benefits'],
  lifestyleRisks: [],
  onboardingCompleted: true,
  profileReviewedAt: '',
  disclaimerAcknowledgedAt: null,
  isLoggedIn: false,
};


const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('login');
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  // Tagged with the owner's email so a previous user's strategy is never shown after switching accounts.
  const [strategyState, setStrategyState] = useState<{ email: string; data: Strategy; ai: AiStrategy | null } | null>(null);
  const isOwnStrategy = strategyState !== null && strategyState.email === user.email && user.isLoggedIn && user.onboardingCompleted;
  const strategy = isOwnStrategy ? strategyState.data : null;
  const aiStrategy = isOwnStrategy ? strategyState.ai : null;
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const homeScreen = (u: UserProfile): ScreenId => (u.onboardingCompleted ? 'dashboard' : 'onboarding');

  // The strategy depends on every profile field, so it is reloaded whenever the profile changes.
  useEffect(() => {
    if (!user.isLoggedIn || !user.onboardingCompleted) return;
    let cancelled = false;
    ShieldIQApi.getStrategy().then(res => {
      if (cancelled || !res || !res.success || !res.data) return;
      setStrategyState({ email: user.email, data: res.data, ai: res.ai ?? null });
      setAiProvider(res.aiProvider ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const generateAiStrategy = useCallback(async (refresh = false) => {
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const res = await ShieldIQApi.generateAiStrategy(refresh);
      if (res && res.success && res.ai) {
        const ai = res.ai;
        setStrategyState(prev => (prev ? { ...prev, ai } : prev));
      }
      else setAiError(res?.error || 'Cannot reach the ShieldIQ server. Please try again.');
    } finally {
      setIsGeneratingAi(false);
    }
  }, []);

  useEffect(() => {
    ShieldIQApi.getHealth().then(res => {
      if (res && res.status === 'UP') {
        setIsBackendConnected(true);
        setAiProvider(res.ai ?? null);
        // Restores the session if the httpOnly cookie is still valid; a 401 just leaves us on login.
        ShieldIQApi.getUserProfile().then(userRes => {
          if (userRes && userRes.success && userRes.user) {
            setUser({ ...userRes.user, isLoggedIn: true });
            setCurrentScreen(screen => (screen === 'login' ? homeScreen(userRes.user) : screen));
          }
        });
        ShieldIQApi.getPolicies().then(policyRes => {
          if (policyRes && policyRes.success && Array.isArray(policyRes.data)) {
            setPolicies(policyRes.data);
          }
        });
      }
    });
  }, []);

  const startSession = (res: { success?: boolean; user?: UserProfile; error?: string } | null) => {
    if (!res) return 'Cannot reach the ShieldIQ server. Please try again.';
    if (!res.success || !res.user) return res.error || 'Authentication failed. Please check credentials.';
    setUser({ ...res.user, isLoggedIn: true });
    setCurrentScreen(homeScreen(res.user));
    return null;
  };

  const login = async (email: string, password: string) => startSession(await ShieldIQApi.login(email, password));

  const register = async (name: string, email: string, password: string) =>
    startSession(await ShieldIQApi.register(email, password, name));

  const logout = () => {
    ShieldIQApi.logout();
    setUser(prev => ({ ...prev, isLoggedIn: false }));
    setCurrentScreen('login');
  };

  const saveProfile = async (res: { success?: boolean; user?: UserProfile; error?: string } | null) => {
    if (!res) return 'Cannot reach the ShieldIQ server. Please try again.';
    if (!res.success || !res.user) return res.error || 'Some details were invalid. Please check the form.';
    setUser({ ...res.user, isLoggedIn: true });
    return null;
  };

  const submitOnboarding = async (data: ProfileUpdate) => {
    const error = await saveProfile(await ShieldIQApi.submitOnboarding(data));
    if (!error) setCurrentScreen('dashboard');
    return error;
  };

  const updateUserProfile = async (data: ProfileUpdate) => saveProfile(await ShieldIQApi.updateUserProfile(data));

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        user,
        setUser,
        policies,
        isBackendConnected,
        selectedPolicyId,
        setSelectedPolicyId,
        login,
        register,
        logout,
        submitOnboarding,
        updateUserProfile,
        strategy,
        aiStrategy,
        aiProvider,
        isGeneratingAi,
        aiError,
        generateAiStrategy,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

/* eslint-disable-next-line react-refresh/only-export-components */
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
};
