export interface HLVInput {
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
export interface RiskSimulationInput {
    scenario: 'death' | 'illness' | 'disability';
    cost: number;
    years: number;
    inflation: number;
    existingCover?: number;
}
export interface RiskSimulationResult {
    depletionAge: number;
    shortfallAmount: number;
    treatmentCostTotal: number;
    earningCapacityLoss: number;
    riskSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendation: string;
}
export interface PortfolioHealthResult {
    score: number;
    rating: 'Optimal' | 'Adequate' | 'Vulnerable' | 'High Risk';
    lifeCoverGap: number;
    healthCoverGap: number;
    redFlags: string[];
    recommendations: string[];
}
export declare class ActuarialService {
    /**
     * Human Life Value (HLV) Engine:
     * Uses income growth, compounding inflation, and present value discount rates
     * to calculate present-value net life insurance requirement.
     */
    static calculateHLV(input: HLVInput): HLVResult;
    /**
     * Scenario Risk Stress Test Simulator:
     * Projects wealth depletion timeline under critical illness, disability, or death events.
     */
    static simulateRiskScenario(input: RiskSimulationInput): RiskSimulationResult;
    /**
     * Portfolio Health & Gap Analysis Engine
     */
    static analyzePortfolio(income: number, existingLifeCover: number, existingHealthCover: number): PortfolioHealthResult;
}
