// Same-origin by default: Express serves the built app in production and Vite proxies /api in development.
// Set VITE_API_URL only when the API must live on another origin (then cookies need CORS_ORIGIN and same-site hosting).
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
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
  /** Strategy numbers recorded by the server at save time; null for older plans. */
  snapshot: { score: number; lifeGap: number; healthGap: number; annualPremium: number } | null;
}

export type CityTier = 'Tier 1 (Metro)' | 'Tier 2 (Emerging Metro)' | 'Tier 3 (Urban Center)';
export const CITY_TIERS: CityTier[] = ['Tier 1 (Metro)', 'Tier 2 (Emerging Metro)', 'Tier 3 (Urban Center)'];

export interface HLVApiInput {
  income: number;
  years: number;
  inflation: number;
  existingCover?: number;
  /** Household context, so the calculator applies the same income-to-replace rule as the strategy. */
  spouseIncome?: number;
  monthlyExpenses?: number;
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
  /** Stable id and formatted values, so the app can show the finding in the user's language. */
  code?: string;
  params?: Record<string, string | number>;
  title: string;
  detail: string;
}

export interface Strategy {
  life: {
    humanLifeValue: number;
    annualIncomeReplaced: number;
    liabilities: number;
    educationCorpus: number;
    savings: number;
    totalNeed: number;
    existing: number;
    gap: number;
    estimatedAnnualPremiumForGap: number;
  };
  health: HealthPlanResult & { existing: number; gap: number };
  criticalIllness: { recommended: number; existing: number; gap: number };
  personalAccident: { recommended: number; existing: number; gap: number };
  parentsHealth: { count: number; eldestAge: number; recommendedCover: number; existing: number; gap: number; estimatedAnnualPremium: number } | null;
  household: { children: number; parents: number; siblings: number; spouseDependent: boolean; dependents: number };
  affordability: {
    annualIncome: number;
    annualExpenses: number;
    expenseRatio: number;
    liabilityToIncome: number;
    annualEmi: number;
    emiToIncomeRatio: number;
    annualSurplus: number;
    premiumBudget: number;
    estimatedAnnualPremium: number;
    premiumToIncomeRatio: number;
    emergencyFundTarget: number;
    /** Old-regime tax relief on the recommended premiums. Absent from older servers. */
    tax?: {
      year: string;
      marginalRatePct: number;
      healthDeduction: number;
      healthSaving: number;
      lifeDeduction: number;
      lifeSavingUpTo: number;
      healthAboveLimit: number;
    };
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

export interface ChatReply {
  answer: string;
  suggestedQuestions: string[];
}

/** Text shown while an answer streams: the follow-up questions after the "---" line stay hidden. */
export const visibleAnswer = (text: string) => text.split(/\n-{3,}/)[0].replace(/\n-{1,2}$/, '');

/**
 * Sends one question and calls onDelta with each piece of the answer as it arrives.
 * Resolves with the complete reply, or with an error message (nothing is saved in that case).
 */
async function streamChat(message: string, onDelta: (text: string) => void): Promise<{ reply: ChatReply } | { error: string }> {
  const fallback = 'Cannot reach ShieldIQ. Please try again.';
  try {
    const res = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    // Errors before the answer starts (limits, onboarding, provider down) come back as plain JSON.
    if (!res.headers.get('Content-Type')?.includes('text/event-stream') || !res.body) {
      const body = await res.json().catch(() => null);
      return { error: body?.error || fallback };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (!block.startsWith('data: ')) continue;
        const event = JSON.parse(block.slice(6));
        if (event.delta) onDelta(event.delta);
        else if (event.done) return { reply: event.reply };
        else if (event.error) return { error: event.error };
      }
    }
    return { error: 'The answer was interrupted. Please try again.' };
  } catch {
    return { error: fallback };
  }
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
  liquidSavings: number | null;
  spouseIncome: number | null;
  spouseAge: number | null;
  dependentDetails: { relation: 'child' | 'parent' | 'sibling'; age: number | null }[];
  parentsHealthCover: number | null;
  loanEmi: number | null;
  homeLoanYearsLeft: number | null;
  existingCiCover: number | null;
  existingPaCover: number | null;
  employerBenefits: string[];
  lifestyleRisks: string[];
  healthConditions: string[];
  heightCm: number | null;
  weightKg: number | null;
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
  clarityScore: number;
  bestFor: string;
  cover: number;
  annualPremium: number;
  monthlyPremium: number;
  note: string | null;
  recommended: boolean;
}

export type FamilyCoverType = 'term_life' | 'health' | 'critical_illness' | 'personal_accident';

/** What each household member should hold (backend family.service.ts). */
export interface FamilyPlan {
  members: {
    id: string;
    role: 'you' | 'spouse' | 'child' | 'parent' | 'sibling';
    age: number | null;
    ageAssumed: boolean;
    earning: boolean;
    notNeeded: { type: FamilyCoverType; reason: string }[];
    notes: string[];
  }[];
  policies: {
    id: string;
    type: FamilyCoverType;
    buyAs: 'own_policy' | 'family_floater' | 'senior_policy';
    covers: string[];
    cover: number;
    existing: number;
    annualPremium: number;
    status: 'buy' | 'covered';
    priority: 'essential' | 'recommended' | 'optional';
    inStrategy: boolean;
    reason: string;
    lookFor: { feature: string; why: string }[];
  }[];
  totalAnnualPremium: number;
  additionalAnnualPremium: number;
  shareOfHouseholdIncome: number;
}

export type RankingMeasure = 'claimValuePaid' | 'claimsPaid' | 'paidWithin30Days' | 'claimsRejected' | 'complaints' | 'solvency' | 'offices';
export type RankingAdjustment = 'largeCover' | 'parents' | 'conditions' | 'smallerCity';

/** Where an insurer stands in ShieldIQ's ranking of IRDAI records for this household. */
export interface InsurerRank {
  /** 0-100 on fixed scales. */
  score: number;
  rank: number;
  strengths: { id: RankingMeasure; value: number }[];
  watchOut: { id: RankingMeasure; value: number } | null;
}

/** Official IRDAI claim records, ranked best first for this household. */
export interface InsurerRecords {
  source: { period: string; threeYearPeriod: string; publisher: string; documents: string; url: string };
  life: (InsurerService & InsurerRank & {
    claimsHandled: number; paidByNumberPct: number; paidByAmountPct: number; settledWithin30DaysPct: number;
    threeYear: { paidByNumberPct: number; paidByAmountPct: number; settledWithin30DaysPct: number; complaintsPer10kPolicies: number };
  })[];
  health: (InsurerService & InsurerRank & {
    claimsHandled: number; paidPct: number; repudiatedPct: number; incurredClaimsRatioPct: number;
    threeYear: { paidPct: number; repudiatedPct: number; complaintsPer10kPolicies: number };
  })[];
  /** Why this household's weights differ from the defaults. */
  adjustments: RankingAdjustment[];
  /** General insurers' retail health business: unranked (IRDAI gives no claim settlement figures for them). Absent from older servers. */
  generalHealth?: GeneralHealthInsurer[];
}

export interface GeneralHealthInsurer {
  insurer: string;
  retailHealthPremiumCr: number;
  /** Retail health claims incurred as % of premium earned. */
  retailClaimsRatioPct: number;
  retailClaimsRatioPct3y: number;
  /** Below 1.5 is under IRDAI's minimum; can be negative. */
  solvencyRatio: number;
  offices: number;
  governmentOwned: boolean;
}

/** Service measures IRDAI publishes for every insurer. */
export interface InsurerService {
  insurer: string;
  complaintsPer10kPolicies: number;
  /** IRDAI's minimum is 1.5. */
  solvencyRatio: number;
  offices: number;
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

  createPlan: (plan: Omit<SavedPlan, 'id' | 'lastModified' | 'snapshot'>) => request('/plans', 'POST', plan),

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

  getFamilyPlan: (): ApiResult<{ data: FamilyPlan; disclaimer: string }> => request('/family-plan'),
  getPlanOptions: (): ApiResult<{ data: PlanTypeOptions[]; disclaimer: string; insurerRecords: InsurerRecords }> => request('/plan-options'),

  streamChat,
  getChatHistory: (): ApiResult<{ messages: (ChatMessage & { createdAt: string })[] }> => request('/ai/chat'),
  clearChatHistory: (): ApiResult<Record<string, never>> => request('/ai/chat', 'DELETE'),

  explainResult: (screen: ExplainScreen, inputs: Record<string, unknown>, result: Record<string, unknown>): ApiResult<{ explanation: AiExplanation }> =>
    request('/ai/explain', 'POST', { screen, inputs, result }),

  parseProfile: (description: string): ApiResult<{ draft: AiProfileDraft }> =>
    request('/ai/parse-profile', 'POST', { description }),

  analyzePolicy: (filename: string, data: string): ApiResult<{ analysis: PolicyAnalysis; fit: PolicyFit | null }> =>
    request('/ai/policy-analysis', 'POST', { filename, data }),

  comparePolicies: (policyIds: string[]) => request('/policies/compare', 'POST', { policyIds }),

  getUserProfile: () => request('/user/profile'),
  acknowledgeDisclaimer: () => request('/user/disclaimer', 'POST'),

  /** The user's stored data as a JSON file, or null on failure. */
  async exportData(): Promise<Blob | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/user/export`, { credentials: 'include' });
      return res.ok ? await res.blob() : null;
    } catch {
      return null;
    }
  },

  deleteAccount: (password: string): Promise<{ success: boolean; error?: string } | null> =>
    request('/user/account', 'DELETE', { password }),
};
