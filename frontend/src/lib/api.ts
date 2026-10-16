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

export type CityTier = 'Tier 1 (Metro)' | 'Tier 2 (Emerging Metro)' | 'Tier 3 (Urban Center)';
export const CITY_TIERS: CityTier[] = ['Tier 1 (Metro)', 'Tier 2 (Emerging Metro)', 'Tier 3 (Urban Center)'];

export interface HLVApiInput {
  income: number;
  years: number;
  inflation: number;
  existingCover?: number;
}

export interface HLVResult {
  recommendedCover: number;
  capitalRequirement: number;
  coverageGap: number;
  incomeReplacementWindow: number;
  inflationAdjustedTarget: number;
}

export interface RiskSimApiInput {
  scenario: 'death' | 'illness' | 'disability';
  cost: number;
  years: number;
  inflation: number;
  existingCover: number;
  age: number;
  income: number;
  monthlyExpenses: number;
}

export interface RiskSimResult {
  depletionAge: number;
  yearsFunded: number;
  shortfallAmount: number;
  treatmentCostTotal: number;
  earningCapacityLoss: number;
  totalFinancialImpact: number;
  adequacyIndex: number;
  riskSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
}

export interface HealthPlanInput {
  adults: number;
  children: number;
  cityTier: CityTier;
  employerCover: number;
  existingCover: number;
  risks: string[];
  eldestAge: number;
}

export interface HealthPlanResult {
  recommendedCover: number;
  basePolicy: number;
  superTopUp: number;
  personalCoverNeeded: number;
  estimatedAnnualPremium: number;
  employerDependencyShare: number;
  adequacyScore: number;
  notes: string[];
}

export interface Insight {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
}

export interface Strategy {
  life: {
    humanLifeValue: number;
    liabilities: number;
    educationCorpus: number;
    totalNeed: number;
    existing: number;
    gap: number;
    estimatedAnnualPremiumForGap: number;
  };
  health: HealthPlanResult & { existing: number; gap: number };
  affordability: {
    annualIncome: number;
    annualExpenses: number;
    expenseRatio: number;
    liabilityToIncome: number;
    premiumBudget: number;
    estimatedAnnualPremium: number;
    premiumToIncomeRatio: number;
    emergencyFundTarget: number;
  };
  score: number;
  rating: 'Optimal' | 'Adequate' | 'Vulnerable' | 'High Risk';
  insights: Insight[];
  assumptions: Record<string, number>;
}

export interface AiStrategy {
  strategy: {
    summary: string;
    priorities: { title: string; action: string; rationale: string; urgency: 'high' | 'medium' | 'low' }[];
    watchouts: string[];
  };
  provider: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiExplanation {
  summary: string;
  drivers: { factor: string; effect: string }[];
  whatIfs: string[];
}

export type ExplainScreen = 'life-calculator' | 'risk-simulator' | 'health-planner';

export interface AiProfileDraft {
  age: number | null;
  income: number | null;
  maritalStatus: 'Single' | 'Married' | null;
  dependents: number | null;
  occupation: string | null;
  cityTier: CityTier | null;
  homeLoan: number | null;
  otherLoans: number | null;
  monthlyExpenses: number | null;
  existingLifeCover: number | null;
  existingHealthCover: number | null;
  employerBenefits: string[];
  lifestyleRisks: string[];
  notes: string[];
}

export interface PolicyAnalysis {
  isInsurancePolicy: boolean;
  policyName: string | null;
  insurer: string | null;
  policyType: 'term_life' | 'health' | 'critical_illness' | 'personal_accident' | 'savings_or_ulip' | 'other';
  sumAssured: number | null;
  annualPremium: number | null;
  policyTermYears: number | null;
  plainSummary: string;
  keyBenefits: string[];
  exclusions: string[];
  waitingPeriods: string[];
  subLimits: string[];
  redFlags: string[];
}

export interface PolicyFit {
  category: 'life' | 'health';
  gap: number;
  coversPct: number;
  remainingGap: number;
  summary: string;
}

export type InsuranceType = 'term_life' | 'health' | 'critical_illness' | 'personal_accident';

export interface PlanOption {
  id: string;
  type: InsuranceType;
  name: string;
  insurer: string;
  structure: string;
  features: string[];
  tradeOffs: string[];
  exclusions: string[];
  waitingPeriod: string;
  claimSettlementRatio: number;
  clarityScore: number;
  bestFor: string;
  cover: number;
  annualPremium: number;
  monthlyPremium: number;
  note: string | null;
  recommended: boolean;
}

export interface PlanTypeOptions {
  type: InsuranceType;
  label: string;
  cover: number;
  coverRationale: string;
  options: PlanOption[];
  recommendedId: string | null;
  recommendationReason: string;
}

type ApiResult<T> = Promise<({ success: true; provider?: string } & T) | { success: false; error?: string; code?: string } | null>;

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

  calculateHLV: (input: HLVApiInput): Promise<{ success: boolean; data: HLVResult; error?: string } | null> =>
    request('/actuarial/hlv-calculator', 'POST', input),

  simulateRiskScenario: (input: RiskSimApiInput): Promise<{ success: boolean; data: RiskSimResult; error?: string } | null> =>
    request('/actuarial/risk-simulator', 'POST', input),

  planHealthCover: (input: HealthPlanInput): Promise<{ success: boolean; data: HealthPlanResult; error?: string } | null> =>
    request('/actuarial/health-plan', 'POST', input),

  getStrategy: (): Promise<{ success: boolean; data?: Strategy; ai?: AiStrategy | null; aiProvider?: string | null; code?: string; error?: string } | null> =>
    request('/strategy'),

  generateAiStrategy: (refresh = false): Promise<{ success: boolean; ai?: AiStrategy; error?: string } | null> =>
    request('/strategy/ai', 'POST', { refresh }),

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

  getPlanOptions: (): ApiResult<{ data: PlanTypeOptions[]; disclaimer: string }> => request('/plan-options'),

  askShieldIQ: (messages: ChatMessage[]): ApiResult<{ reply: { answer: string; suggestedQuestions: string[] } }> =>
    request('/ai/chat', 'POST', { messages }),

  explainResult: (screen: ExplainScreen, inputs: Record<string, unknown>, result: Record<string, unknown>): ApiResult<{ explanation: AiExplanation }> =>
    request('/ai/explain', 'POST', { screen, inputs, result }),

  parseProfile: (description: string): ApiResult<{ draft: AiProfileDraft }> =>
    request('/ai/parse-profile', 'POST', { description }),

  analyzePolicy: (filename: string, data: string): ApiResult<{ analysis: PolicyAnalysis; fit: PolicyFit | null }> =>
    request('/ai/policy-analysis', 'POST', { filename, data }),

  comparePolicies: (policyIds: string[]) => request('/policies/compare', 'POST', { policyIds }),

  getUserProfile: () => request('/user/profile'),
};
