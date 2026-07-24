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
  | 'deepdive';

export interface UserProfile {
  name: string;
  email: string;
  age: number;
  income: number;
  dependents: number;
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
}

interface AppContextType {
  currentScreen: ScreenId;
  setCurrentScreen: (screen: ScreenId) => void;
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  policies: Policy[];
  isBackendConnected: boolean;
  login: (name: string, email: string) => void;
  logout: () => void;
}

const defaultUser: UserProfile = {
  name: 'Alex Vance',
  email: 'alex.vance@shieldiq.internal',
  age: 34,
  income: 145000,
  dependents: 2,
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
    status: 'Active',
  },
  {
    id: 'POL-4410',
    title: 'Executive Health Safeguard',
    provider: 'Bupa International',
    category: 'Health',
    coverageAmount: 500000,
    monthlyPremium: 210,
    status: 'Active',
  },
  {
    id: 'POL-9012',
    title: 'Disability Income Continuity',
    provider: 'MetLife Actuarial',
    category: 'Critical Illness',
    coverageAmount: 750000,
    monthlyPremium: 95,
    status: 'Recommended',
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

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

  const login = (name: string, email: string) => {
    setUser(prev => ({ ...prev, name, email, isLoggedIn: true }));
    setCurrentScreen('dashboard');
  };

  const logout = () => {
    setUser(prev => ({ ...prev, isLoggedIn: false }));
    setCurrentScreen('login');
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
        login,
        logout,
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
