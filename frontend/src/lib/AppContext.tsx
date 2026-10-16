import React, { createContext, useContext, useEffect, useState } from 'react';
import { ShieldIQApi } from './api';

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
  | 'systemstates';

export interface UserProfile {
  name: string;
  email: string;
  age: number;
  income: number;
  dependents: number;
  city?: string;
  occupation?: string;
  isLoggedIn: boolean;
}

export interface Policy {
  id: string;
  title: string;
  provider: string;
  category: 'Life' | 'Health' | 'Property' | 'Critical Illness';
  coverageAmount: number;
  monthlyPremium: number;
  status: 'Active' | 'Under Review' | 'Recommended';
  claimRatio?: number;
  clarityScore?: number;
  features?: string[];
  exclusions?: string[];
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
  submitOnboarding: (data: Record<string, unknown>) => Promise<boolean>;
  updateUserProfile: (data: Partial<UserProfile>) => void;
}

const defaultUser: UserProfile = {
  name: 'Alex Vance',
  email: 'alex.vance@shieldiq.internal',
  age: 34,
  income: 145000,
  dependents: 2,
  city: 'San Francisco, CA',
  occupation: 'Senior Systems Architect',
  isLoggedIn: true,
};

const initialPolicies: Policy[] = [
  {
    id: 'POL-8821',
    title: 'OmniShield Premium Life',
    provider: 'Prudential Global',
    category: 'Life',
    coverageAmount: 1500000,
    monthlyPremium: 145,
    claimRatio: 99.2,
    clarityScore: 94,
    status: 'Active',
    features: ['Terminal Illness Payout', 'Accidental Death Benefit 2x', 'Waiver of Premium Rider'],
    exclusions: ['Self-inflicted injuries within 12 months', 'Hazardous aviation sports without rider'],
  },
  {
    id: 'POL-4410',
    title: 'Executive Health Safeguard',
    provider: 'Bupa International',
    category: 'Health',
    coverageAmount: 500000,
    monthlyPremium: 210,
    claimRatio: 97.8,
    clarityScore: 88,
    status: 'Active',
    features: ['Zero Room Rent Capping', 'Global Emergency Care', '100% Restore Benefit'],
    exclusions: ['Cosmetic surgeries', 'Pre-existing conditions waiting window (24 months)'],
  },
  {
    id: 'POL-9012',
    title: 'Disability Income Continuity',
    provider: 'MetLife Actuarial',
    category: 'Critical Illness',
    coverageAmount: 750000,
    monthlyPremium: 95,
    claimRatio: 98.4,
    clarityScore: 91,
    status: 'Recommended',
    features: ['Monthly Income Replacement', 'Inflation Adjustment Indexing', 'Partial Disability Coverage'],
    exclusions: ['Pre-existing mental health exclusions', 'Undeclared hazardous occupations'],
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('login');
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>('POL-8821');

  useEffect(() => {
    ShieldIQApi.getHealth().then(res => {
      if (res && res.status === 'UP') {
        setIsBackendConnected(true);
        // Restores the session if the httpOnly cookie is still valid; a 401 just leaves us on login.
        ShieldIQApi.getUserProfile().then(userRes => {
          if (userRes && userRes.success && userRes.user) {
            setUser({ ...userRes.user, isLoggedIn: true });
            setCurrentScreen(screen => (screen === 'login' ? 'dashboard' : screen));
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

  const startSession = (res: { success?: boolean; user?: UserProfile; error?: string } | null, next: ScreenId) => {
    if (!res) return 'Cannot reach the ShieldIQ server. Please try again.';
    if (!res.success || !res.user) return res.error || 'Authentication failed. Please check credentials.';
    setUser({ ...res.user, isLoggedIn: true });
    setCurrentScreen(next);
    return null;
  };

  const login = async (email: string, password: string) =>
    startSession(await ShieldIQApi.login(email, password), 'dashboard');

  const register = async (name: string, email: string, password: string) =>
    startSession(await ShieldIQApi.register(email, password, name), 'onboarding');

  const logout = () => {
    ShieldIQApi.logout();
    setUser(prev => ({ ...prev, isLoggedIn: false }));
    setCurrentScreen('login');
  };

  const submitOnboarding = async (data: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await ShieldIQApi.submitOnboarding(data);
      if (res && res.success && res.user) {
        setUser(prev => ({
          ...prev,
          ...res.user,
          isLoggedIn: true,
        }));
      } else {
        setUser(prev => ({
          ...prev,
          age: typeof data.age === 'number' ? data.age : prev.age,
          income: typeof data.income === 'number' ? data.income : prev.income,
          dependents: typeof data.dependents === 'number' ? data.dependents : prev.dependents,
          city: typeof data.city === 'string' ? data.city : prev.city,
          occupation: typeof data.occupation === 'string' ? data.occupation : prev.occupation,
        }));
      }
      setCurrentScreen('dashboard');
      return true;
    } catch {
      setUser(prev => ({
        ...prev,
        age: typeof data.age === 'number' ? data.age : prev.age,
        income: typeof data.income === 'number' ? data.income : prev.income,
        dependents: typeof data.dependents === 'number' ? data.dependents : prev.dependents,
        city: typeof data.city === 'string' ? data.city : prev.city,
        occupation: typeof data.occupation === 'string' ? data.occupation : prev.occupation,
      }));
      setCurrentScreen('dashboard');
      return true;
    }
  };

  const updateUserProfile = (data: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...data }));
    // email is the login identity and not editable via the profile endpoint
    const { name, age, income, dependents, city, occupation } = data;
    ShieldIQApi.updateUserProfile({ name, age, income, dependents, city, occupation }).then(res => {
      if (res && res.success && res.user) setUser({ ...res.user, isLoggedIn: true });
    });
  };

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
