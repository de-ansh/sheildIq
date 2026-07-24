export class ActuarialService {
    /**
     * Human Life Value (HLV) Engine:
     * Uses income growth, compounding inflation, and present value discount rates
     * to calculate present-value net life insurance requirement.
     */
    static calculateHLV(input) {
        const { income, years, inflation, existingCover = 0 } = input;
        const realDiscountRate = Math.max(0.02, 0.08 - inflation / 100);
        // Multi-period present value of future lost income
        let totalPV = 0;
        let currentAnnual = income * 0.7; // 70% net personal income contribution
        for (let t = 1; t <= years; t++) {
            currentAnnual *= 1 + inflation / 100;
            totalPV += currentAnnual / Math.pow(1 + realDiscountRate, t);
        }
        const capitalRequirement = Math.round(totalPV);
        const recommendedCover = Math.max(100000, capitalRequirement);
        const coverageGap = Math.max(0, recommendedCover - existingCover);
        const inflationAdjustedTarget = Math.round(income * Math.pow(1 + inflation / 100, years));
        return {
            recommendedCover,
            capitalRequirement,
            coverageGap,
            incomeReplacementWindow: years,
            inflationAdjustedTarget,
        };
    }
    /**
     * Scenario Risk Stress Test Simulator:
     * Projects wealth depletion timeline under critical illness, disability, or death events.
     */
    static simulateRiskScenario(input) {
        const { scenario, cost, years, inflation, existingCover = 200000 } = input;
        // Cumulative medical inflation & treatment multiplier
        const medicalInflationRate = inflation / 100 + 0.03; // Medical inflation ~ 3% above CPI
        const totalTreatmentCost = Math.round(cost * Math.pow(1 + medicalInflationRate, years));
        let earningCapacityLoss = 0;
        let severity = 'MEDIUM';
        let recommendation = '';
        if (scenario === 'illness') {
            earningCapacityLoss = Math.round(cost * 0.6 * years);
            severity = totalTreatmentCost > existingCover ? 'CRITICAL' : 'MEDIUM';
            recommendation =
                'Increase critical illness rider by ₹50L and secure hospital cash indemnity policy.';
        }
        else if (scenario === 'disability') {
            earningCapacityLoss = Math.round(cost * 1.2 * years);
            severity = 'HIGH';
            recommendation =
                'Attach total permanent disability rider providing monthly income replacement.';
        }
        else {
            // death
            earningCapacityLoss = Math.round(cost * 2.0 * years);
            severity = existingCover < cost * 10 ? 'CRITICAL' : 'LOW';
            recommendation = 'Expand pure term life cover to minimum 15x annual household income.';
        }
        const totalFinancialImpact = totalTreatmentCost + earningCapacityLoss;
        const shortfallAmount = Math.max(0, totalFinancialImpact - existingCover);
        const depletionAge = Math.min(75, Math.max(42, Math.round(52 - shortfallAmount / 50000)));
        return {
            depletionAge,
            shortfallAmount,
            treatmentCostTotal: totalTreatmentCost,
            earningCapacityLoss,
            riskSeverity: severity,
            recommendation,
        };
    }
    /**
     * Portfolio Health & Gap Analysis Engine
     */
    static analyzePortfolio(income, existingLifeCover, existingHealthCover) {
        const targetLifeCover = income * 12;
        const targetHealthCover = Math.max(500000, income * 0.5);
        const lifeGap = Math.max(0, targetLifeCover - existingLifeCover);
        const healthGap = Math.max(0, targetHealthCover - existingHealthCover);
        const lifeRatio = Math.min(1, existingLifeCover / targetLifeCover);
        const healthRatio = Math.min(1, existingHealthCover / targetHealthCover);
        const score = Math.round((lifeRatio * 0.6 + healthRatio * 0.4) * 100);
        let rating = 'Adequate';
        if (score >= 85)
            rating = 'Optimal';
        else if (score >= 65)
            rating = 'Adequate';
        else if (score >= 40)
            rating = 'Vulnerable';
        else
            rating = 'High Risk';
        const redFlags = [];
        const recommendations = [];
        if (lifeGap > 500000) {
            redFlags.push('Significant term life protection gap detected');
            recommendations.push(`Add ₹${(lifeGap / 100000).toFixed(1)}L pure term insurance cover.`);
        }
        if (healthGap > 200000) {
            redFlags.push('Health insurance deductible vulnerability');
            recommendations.push(`Enhance family health cover by ₹${(healthGap / 100000).toFixed(1)}L super top-up.`);
        }
        if (redFlags.length === 0) {
            recommendations.push('Portfolio is optimal. Re-evaluate annually or upon major life events.');
        }
        return {
            score,
            rating,
            lifeCoverGap: lifeGap,
            healthCoverGap: healthGap,
            redFlags,
            recommendations,
        };
    }
}
