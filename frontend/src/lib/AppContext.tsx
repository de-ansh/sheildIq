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
  | 'savedplans';

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
  login: (name: string, email: string) => Promise<boolean>;
  logout: () => void;
  submitOnboarding: (data: Record<string, unknown>) => Promise<boolean>;
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
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>('POL-8821');

  useEffect(() => {
    ShieldIQApi.getHealth().then(res => {
      if (res && res.status === 'UP') {
        setIsBackendConnected(true);
        ShieldIQApi.getUserProfile().then(userRes => {
          if (userRes && userRes.success && userRes.user) {
            setUser(prev => ({ ...prev, ...userRes.user }));
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

  const login = async (name: string, email: string): Promise<boolean> => {
    try {
      const res = await ShieldIQApi.login(email, name);
      if (res && res.success && res.user) {
        setUser({
          name: res.user.name || name || 'Alex Vance',
          email: res.user.email || email,
          age: res.user.age || 34,
          income: res.user.income || 145000,
          dependents: res.user.dependents ?? 2,
          city: res.user.city || 'San Francisco, CA',
          occupation: res.user.occupation || 'Senior Systems Architect',
          isLoggedIn: true,
        });
      } else {
        setUser(prev => ({
          ...prev,
          name: name || prev.name,
          email,
          isLoggedIn: true,
        }));
      }
      setCurrentScreen('dashboard');
      return true;
    } catch {
      setUser(prev => ({
        ...prev,
        name: name || prev.name,
        email,
        isLoggedIn: true,
      }));
      setCurrentScreen('dashboard');
      return true;
    }
  };

  const logout = () => {
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
        logout,
        submitOnboarding,
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
