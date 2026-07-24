const API_BASE_URL = 'http://localhost:5001/api/v1';

export interface HLVApiInput {
  income: number;
  years: number;
  inflation: number;
  existingCover?: number;
}

export interface RiskSimApiInput {
  scenario: 'death' | 'illness' | 'disability';
  cost: number;
  years: number;
  inflation: number;
  existingCover?: number;
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

  async calculateHLV(input: HLVApiInput) {
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

  async simulateRiskScenario(input: RiskSimApiInput) {
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

  async getPolicies() {
    try {
      const res = await fetch(`${API_BASE_URL}/policies`);
      return await res.json();
    } catch {
      return null;
    }
  },

  async getUserProfile() {
    try {
      const res = await fetch(`${API_BASE_URL}/user/profile`);
      return await res.json();
    } catch {
      return null;
    }
  },
};
