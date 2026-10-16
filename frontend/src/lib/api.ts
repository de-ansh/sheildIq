const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';
/** JSON request sending the httpOnly session cookie; resolves to null when the backend is unreachable. */
async function request(path: string, method = 'GET', body?: unknown) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  } catch {
    return null;
  }
}

export interface SavedPlan {
  id: string;
  name: string;
  category: string;
  coverageAmount: number;
  monthlyPremium: number;
  status: 'Adequate' | 'Gap Detected' | 'Incomplete' | 'Archived';
  lastModified: string;
  description: string;
}

export interface HLVApiInput {
  income: number;
  years: number;
  inflation: number;
  existingCover?: number;
}

export interface HLVResult {
  recommendedCover: number;
  coverageGap: number;
  capitalRequirement?: number;
  incomeReplacementWindow?: number;
  inflationAdjustedTarget?: number;
  gapPercentage?: number;
  totalFutureIncome?: number;
  inflationAdjustedAnnualRequirement?: number;
  ruleOfThumbCover?: number;
}

export interface RiskSimApiInput {
  scenario: 'death' | 'illness' | 'disability';
  cost: number;
  years: number;
  inflation: number;
  existingCover?: number;
}

export interface RiskSimResult {
  depletionAge?: number;
  shortfallAmount?: number;
  treatmentCostTotal?: number;
  earningCapacityLoss?: number;
  riskSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation?: string;
  scenario?: string;
  totalFinancialImpact?: number;
  netShortfall?: number;
  fundingGapFormatted?: string;
  survivalProbabilityIndex?: number;
  recommendedEmergencyCorpus?: number;
  stressLevel?: 'LOW' | 'MEDIUM' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface CoverageAnalysisApiInput {
  income: number;
  existingLifeCover: number;
  existingHealthCover: number;
}

export const ShieldIQApi = {
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return await res.json();
    } catch {
      return { status: 'OFFLINE' };
    }
  },

  login: (email: string, password: string) => request('/auth/login', 'POST', { email, password }),

  register: (email: string, password: string, name: string) =>
    request('/auth/register', 'POST', { email, password, name }),

  logout: () => request('/auth/logout', 'POST'),

  logoutAll: () => request('/auth/logout-all', 'POST'),

  forgotPassword: (email: string) => request('/auth/forgot-password', 'POST', { email }),

  resetPassword: (token: string, password: string) => request('/auth/reset-password', 'POST', { token, password }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request('/auth/change-password', 'POST', { currentPassword, newPassword }),

  submitOnboarding: (data: Record<string, unknown>) => request('/user/onboarding', 'POST', data),

  updateUserProfile: (data: Record<string, unknown>) => request('/user/profile', 'PUT', data),

  getPlans: () => request('/plans'),

  createPlan: (plan: Omit<SavedPlan, 'id' | 'lastModified'>) => request('/plans', 'POST', plan),

  deletePlan: (id: string) => request(`/plans/${encodeURIComponent(id)}`, 'DELETE'),

  async calculateHLV(input: HLVApiInput): Promise<{ success: boolean; data: HLVResult } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/actuarial/hlv-calculator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async simulateRiskScenario(input: RiskSimApiInput): Promise<{ success: boolean; data: RiskSimResult } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/actuarial/risk-simulator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async getCoverageAnalysis(input: CoverageAnalysisApiInput) {
    try {
      const res = await fetch(`${API_BASE_URL}/actuarial/coverage-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async getPolicies() {
    try {
      const res = await fetch(`${API_BASE_URL}/policies`);
      return await res.json();
    } catch {
      return null;
    }
  },

  async getPolicyById(id: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/policies/${id}`);
      return await res.json();
    } catch {
      return null;
    }
  },

  async comparePolicies(policyIds: string[]) {
    try {
      const res = await fetch(`${API_BASE_URL}/policies/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyIds }),
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  getUserProfile: () => request('/user/profile'),
};
