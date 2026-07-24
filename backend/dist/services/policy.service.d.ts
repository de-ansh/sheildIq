export interface PolicyDetail {
    id: string;
    title: string;
    provider: string;
    category: 'Life' | 'Health' | 'Property' | 'Critical Illness';
    coverageAmount: number;
    monthlyPremium: number;
    claimRatio: number;
    status: 'Active' | 'Under Review' | 'Recommended';
    features: string[];
    exclusions: string[];
    clarityScore: number;
}
export declare class PolicyService {
    static getAllPolicies(): PolicyDetail[];
    static getPolicyById(id: string): PolicyDetail | undefined;
    static comparePolicies(policyIds: string[]): {
        comparedCount: number;
        policies: PolicyDetail[];
        recommendation: string;
    };
}
