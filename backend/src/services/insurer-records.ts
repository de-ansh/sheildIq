/**
 * Official claim records of Indian insurers, from IRDAI publications. Update once a year when IRDAI publishes
 * the next Handbook on Indian Insurance Statistics (irdai.gov.in/handbook-of-indian-insurance).
 *
 * Life: individual death claims, Handbook 2024-25 Table 15. "Handled" = pending at start + intimated in the year;
 *   paid % is claims paid / handled, by number and by amount. Industry total 97.82% / 96.29% matches
 *   Annual Report 2024-25 Table I.11.
 * Health: standalone health insurers, Handbook 2024-25 Table 53 (same paid / handled definition, repudiated
 *   likewise), and incurred claims ratio from Annual Report 2024-25 Statement 10. General insurers are left out
 *   because Table 53 mixes their health claims with motor, fire and other lines.
 * Service: claim speed (Table 18), complaints per 10,000 policies (grievances in Tables 37/56 over policies in
 *   Tables 10/58), solvency at March 2025 (Tables 23/49; IRDAI minimum 1.5) and offices (Tables 29/54).
 *   Not used: network hospitals (Table 78 counts a hospital in several accreditation columns, so totals overstate
 *   networks) and health claim age (every standalone insurer pays 99.8-100% within 3 months, so it doesn't separate them).
 * Three-year figures pool FY 2022-23 to 2024-25 (totals over totals, so a big year weighs more), from the same
 *   tables' earlier-year columns; they feed the ranking in insurer-ranking.ts, which is steadier than one year.
 * Insurers with too few claims for a stable ratio (under 1,000 life / 10,000 health claims) are omitted.
 */

export const INSURER_RECORDS_SOURCE = {
  period: 'FY 2024-25',
  /** Years pooled in each record's threeYear figures. */
  threeYearPeriod: 'FY 2022-23 to 2024-25',
  publisher: 'IRDAI',
  documents: 'Handbook on Indian Insurance Statistics 2024-25 (Tables 10, 15, 18, 23, 29, 37, 49, 53, 54, 56, 58, 62) and Annual Report 2024-25 (Statement 10)',
  url: 'https://irdai.gov.in/handbook-of-indian-insurance',
} as const;

export interface LifeInsurerRecord {
  insurer: string;
  claimsHandled: number;
  paidByNumberPct: number;
  paidByAmountPct: number;
  /** Death claims settled within 30 days of being reported, as % of claims settled (Table 18). */
  settledWithin30DaysPct: number;
  /** Complaints reported in the year per 10,000 individual policies in force at year end, all lines (Tables 37 and 10). */
  complaintsPer10kPolicies: number;
  /** Available / required solvency margin at March 2025 (Table 23). IRDAI's minimum is 1.5. */
  solvencyRatio: number;
  /** Offices across India at the year end (Table 29). */
  offices: number;
  /** FY 2022-23 to 2024-25 pooled. */
  threeYear: { paidByNumberPct: number; paidByAmountPct: number; settledWithin30DaysPct: number; complaintsPer10kPolicies: number };
}

export interface HealthInsurerRecord {
  insurer: string;
  claimsHandled: number;
  paidPct: number;
  repudiatedPct: number;
  /** Claims incurred as % of premium earned; very low means the insurer keeps more of the premium. */
  incurredClaimsRatioPct: number;
  /** Complaints reported in the year per 10,000 health policies issued (Tables 56 and 58). */
  complaintsPer10kPolicies: number;
  /** Available / required solvency margin at March 2025 (Table 49). IRDAI's minimum is 1.5. */
  solvencyRatio: number;
  /** Offices across India at 31 March 2025 (Table 54). */
  offices: number;
  /** FY 2022-23 to 2024-25 pooled. */
  threeYear: { paidPct: number; repudiatedPct: number; complaintsPer10kPolicies: number };
}

export const LIFE_INSURER_RECORDS: LifeInsurerRecord[] = [
  { insurer: 'Axis Max Life', claimsHandled: 20225, paidByNumberPct: 99.70, paidByAmountPct: 97.39, settledWithin30DaysPct: 94.4, complaintsPer10kPolicies: 9.2, solvencyRatio: 2.01, offices: 404, threeYear: { paidByNumberPct: 99.62, paidByAmountPct: 96.42, settledWithin30DaysPct: 98.0, complaintsPer10kPolicies: 8.6 } },
  { insurer: 'HDFC Life', claimsHandled: 19729, paidByNumberPct: 99.68, paidByAmountPct: 97.96, settledWithin30DaysPct: 100.0, complaintsPer10kPolicies: 5.7, solvencyRatio: 1.94, offices: 652, threeYear: { paidByNumberPct: 99.53, paidByAmountPct: 96.84, settledWithin30DaysPct: 99.9, complaintsPer10kPolicies: 5.1 } },
  { insurer: 'PNB MetLife', claimsHandled: 5639, paidByNumberPct: 99.57, paidByAmountPct: 99.30, settledWithin30DaysPct: 100.0, complaintsPer10kPolicies: 11.8, solvencyRatio: 1.72, offices: 155, threeYear: { paidByNumberPct: 99.28, paidByAmountPct: 97.51, settledWithin30DaysPct: 99.8, complaintsPer10kPolicies: 13.2 } },
  { insurer: 'Canara HSBC Life', claimsHandled: 2787, paidByNumberPct: 99.43, paidByAmountPct: 99.08, settledWithin30DaysPct: 89.1, complaintsPer10kPolicies: 10.8, solvencyRatio: 2.06, offices: 104, threeYear: { paidByNumberPct: 99.24, paidByAmountPct: 97.83, settledWithin30DaysPct: 95.9, complaintsPer10kPolicies: 11.7 } },
  { insurer: 'Tata AIA', claimsHandled: 8577, paidByNumberPct: 99.41, paidByAmountPct: 98.38, settledWithin30DaysPct: 98.7, complaintsPer10kPolicies: 7.9, solvencyRatio: 1.80, offices: 612, threeYear: { paidByNumberPct: 99.21, paidByAmountPct: 96.55, settledWithin30DaysPct: 98.7, complaintsPer10kPolicies: 7.0 } },
  { insurer: 'ICICI Prudential', claimsHandled: 12405, paidByNumberPct: 99.31, paidByAmountPct: 98.06, settledWithin30DaysPct: 98.1, complaintsPer10kPolicies: 6.6, solvencyRatio: 2.12, offices: 459, threeYear: { paidByNumberPct: 97.83, paidByAmountPct: 95.72, settledWithin30DaysPct: 97.4, complaintsPer10kPolicies: 6.8 } },
  { insurer: 'Bajaj Allianz Life', claimsHandled: 14094, paidByNumberPct: 99.29, paidByAmountPct: 93.04, settledWithin30DaysPct: 93.9, complaintsPer10kPolicies: 8.7, solvencyRatio: 3.59, offices: 596, threeYear: { paidByNumberPct: 99.18, paidByAmountPct: 93.35, settledWithin30DaysPct: 97.5, complaintsPer10kPolicies: 7.7 } },
  { insurer: 'Bharti AXA Life', claimsHandled: 2085, paidByNumberPct: 99.18, paidByAmountPct: 98.41, settledWithin30DaysPct: 94.0, complaintsPer10kPolicies: 51.8, solvencyRatio: 1.67, offices: 212, threeYear: { paidByNumberPct: 99.10, paidByAmountPct: 97.71, settledWithin30DaysPct: 98.0, complaintsPer10kPolicies: 44.7 } },
  { insurer: 'Reliance Nippon Life', claimsHandled: 8376, paidByNumberPct: 98.93, paidByAmountPct: 92.04, settledWithin30DaysPct: 95.3, complaintsPer10kPolicies: 5.5, solvencyRatio: 2.35, offices: 712, threeYear: { paidByNumberPct: 98.75, paidByAmountPct: 93.13, settledWithin30DaysPct: 93.5, complaintsPer10kPolicies: 4.9 } },
  { insurer: 'Star Union Dai-ichi', claimsHandled: 2413, paidByNumberPct: 98.84, paidByAmountPct: 96.93, settledWithin30DaysPct: 99.2, complaintsPer10kPolicies: 14.4, solvencyRatio: 2.30, offices: 172, threeYear: { paidByNumberPct: 97.86, paidByAmountPct: 95.88, settledWithin30DaysPct: 94.3, complaintsPer10kPolicies: 15.4 } },
  { insurer: 'Aditya Birla Sun Life', claimsHandled: 6361, paidByNumberPct: 98.65, paidByAmountPct: 96.22, settledWithin30DaysPct: 100.0, complaintsPer10kPolicies: 6.4, solvencyRatio: 1.88, offices: 444, threeYear: { paidByNumberPct: 98.39, paidByAmountPct: 94.46, settledWithin30DaysPct: 99.9, complaintsPer10kPolicies: 7.3 } },
  { insurer: 'Kotak Life', claimsHandled: 4678, paidByNumberPct: 98.61, paidByAmountPct: 95.88, settledWithin30DaysPct: 94.0, complaintsPer10kPolicies: 7.6, solvencyRatio: 2.45, offices: 323, threeYear: { paidByNumberPct: 98.39, paidByAmountPct: 94.83, settledWithin30DaysPct: 97.9, complaintsPer10kPolicies: 7.4 } },
  { insurer: 'Ageas Federal', claimsHandled: 1145, paidByNumberPct: 98.52, paidByAmountPct: 95.83, settledWithin30DaysPct: 97.2, complaintsPer10kPolicies: 7.3, solvencyRatio: 2.70, offices: 79, threeYear: { paidByNumberPct: 96.93, paidByAmountPct: 91.93, settledWithin30DaysPct: 99.1, complaintsPer10kPolicies: 8.1 } },
  { insurer: 'SBI Life', claimsHandled: 44949, paidByNumberPct: 98.34, paidByAmountPct: 95.26, settledWithin30DaysPct: 99.1, complaintsPer10kPolicies: 2.4, solvencyRatio: 1.96, offices: 1110, threeYear: { paidByNumberPct: 97.92, paidByAmountPct: 95.42, settledWithin30DaysPct: 98.9, complaintsPer10kPolicies: 3.0 } },
  { insurer: 'Shriram Life', claimsHandled: 4852, paidByNumberPct: 98.31, paidByAmountPct: 81.71, settledWithin30DaysPct: 100.0, complaintsPer10kPolicies: 16.4, solvencyRatio: 1.79, offices: 537, threeYear: { paidByNumberPct: 97.96, paidByAmountPct: 80.00, settledWithin30DaysPct: 99.4, complaintsPer10kPolicies: 11.8 } },
  { insurer: 'IndiaFirst Life', claimsHandled: 3706, paidByNumberPct: 98.22, paidByAmountPct: 95.98, settledWithin30DaysPct: 87.0, complaintsPer10kPolicies: 12.9, solvencyRatio: 2.00, offices: 65, threeYear: { paidByNumberPct: 97.80, paidByAmountPct: 94.07, settledWithin30DaysPct: 90.5, complaintsPer10kPolicies: 18.9 } },
  { insurer: 'LIC', claimsHandled: 869086, paidByNumberPct: 97.59, paidByAmountPct: 96.08, settledWithin30DaysPct: 97.1, complaintsPer10kPolicies: 2.8, solvencyRatio: 2.11, offices: 5004, threeYear: { paidByNumberPct: 98.09, paidByAmountPct: 95.51, settledWithin30DaysPct: 96.1, complaintsPer10kPolicies: 2.9 } },
];

export const HEALTH_INSURER_RECORDS: HealthInsurerRecord[] = [
  { insurer: 'Care Health', claimsHandled: 1508929, paidPct: 95.19, repudiatedPct: 3.10, incurredClaimsRatioPct: 64.53, complaintsPer10kPolicies: 37.3, solvencyRatio: 1.68, offices: 269, threeYear: { paidPct: 90.17, repudiatedPct: 5.70, complaintsPer10kPolicies: 33.7 } },
  { insurer: 'Aditya Birla Health', claimsHandled: 2427651, paidPct: 94.09, repudiatedPct: 3.98, incurredClaimsRatioPct: 71.50, complaintsPer10kPolicies: 46.7, solvencyRatio: 1.84, offices: 225, threeYear: { paidPct: 94.30, repudiatedPct: 4.07, complaintsPer10kPolicies: 52.8 } },
  { insurer: 'ManipalCigna', claimsHandled: 492746, paidPct: 93.06, repudiatedPct: 6.24, incurredClaimsRatioPct: 74.81, complaintsPer10kPolicies: 53.0, solvencyRatio: 1.76, offices: 104, threeYear: { paidPct: 89.92, repudiatedPct: 8.91, complaintsPer10kPolicies: 43.8 } },
  { insurer: 'Niva Bupa', claimsHandled: 1039909, paidPct: 90.64, repudiatedPct: 7.30, incurredClaimsRatioPct: 61.22, complaintsPer10kPolicies: 33.0, solvencyRatio: 3.03, offices: 212, threeYear: { paidPct: 90.02, repudiatedPct: 7.84, complaintsPer10kPolicies: 27.3 } },
  { insurer: 'Star Health', claimsHandled: 2575862, paidPct: 78.50, repudiatedPct: 12.33, incurredClaimsRatioPct: 70.30, complaintsPer10kPolicies: 24.6, solvencyRatio: 2.21, offices: 913, threeYear: { paidPct: 77.29, repudiatedPct: 14.39, complaintsPer10kPolicies: 21.1 } },
];

/**
 * General insurers' retail health business: individual and family-floater policies only (Handbook 2024-25 Table 62,
 * "Individual Family Floater" + "Individual Other than Family Floater"), FY 2024-25 and pooled FY 2022-23 to 2024-25,
 * with solvency (Table 49, March 2025) and offices (Table 54). IRDAI publishes no insurer-wise health claim settlement
 * or rejection figures for general insurers (Table 53 mixes all lines; Table 66 and Annual Report Table I.29 are
 * industry totals), so these are not ranked with the standalone health insurers. Complaints are left out because
 * Table 56 counts complaints across all lines. Insurers under Rs 100 Cr of retail health premium are omitted.
 */
export interface GeneralHealthInsurerRecord {
  insurer: string;
  /** Net earned premium from retail health policies, Rs Cr, FY 2024-25. */
  retailHealthPremiumCr: number;
  /** Retail health claims incurred as % of net earned premium. Over 100%: paying out more than it earns. */
  retailClaimsRatioPct: number;
  retailClaimsRatioPct3y: number;
  /** March 2025. Negative values are real: three government-owned insurers are below IRDAI's 1.5 minimum. */
  solvencyRatio: number;
  offices: number;
  governmentOwned: boolean;
}

export const GENERAL_HEALTH_INSURER_RECORDS: GeneralHealthInsurerRecord[] = [
  { insurer: 'New India Assurance', retailHealthPremiumCr: 3042, retailClaimsRatioPct: 89.7, retailClaimsRatioPct3y: 94.6, solvencyRatio: 1.91, offices: 1668, governmentOwned: true },
  { insurer: 'HDFC ERGO', retailHealthPremiumCr: 2339, retailClaimsRatioPct: 89.9, retailClaimsRatioPct3y: 85.1, solvencyRatio: 2.00, offices: 299, governmentOwned: false },
  { insurer: 'National Insurance', retailHealthPremiumCr: 2293, retailClaimsRatioPct: 91.6, retailClaimsRatioPct3y: 92.2, solvencyRatio: -0.67, offices: 866, governmentOwned: true },
  { insurer: 'Oriental Insurance', retailHealthPremiumCr: 1599, retailClaimsRatioPct: 106.6, retailClaimsRatioPct3y: 104.7, solvencyRatio: -1.03, offices: 1049, governmentOwned: true },
  { insurer: 'United India Insurance', retailHealthPremiumCr: 1580, retailClaimsRatioPct: 98.6, retailClaimsRatioPct3y: 101.7, solvencyRatio: -0.65, offices: 1359, governmentOwned: true },
  { insurer: 'ICICI Lombard', retailHealthPremiumCr: 1288, retailClaimsRatioPct: 68.3, retailClaimsRatioPct3y: 70.6, solvencyRatio: 2.69, offices: 328, governmentOwned: false },
  { insurer: 'Tata AIG', retailHealthPremiumCr: 940, retailClaimsRatioPct: 75.6, retailClaimsRatioPct3y: 72.0, solvencyRatio: 1.81, offices: 250, governmentOwned: false },
  { insurer: 'Bajaj Allianz General', retailHealthPremiumCr: 759, retailClaimsRatioPct: 77.1, retailClaimsRatioPct3y: 77.7, solvencyRatio: 3.25, offices: 221, governmentOwned: false },
  { insurer: 'SBI General', retailHealthPremiumCr: 468, retailClaimsRatioPct: 112.0, retailClaimsRatioPct3y: 92.9, solvencyRatio: 2.03, offices: 140, governmentOwned: false },
  { insurer: 'IFFCO Tokio', retailHealthPremiumCr: 230, retailClaimsRatioPct: 96.9, retailClaimsRatioPct3y: 95.6, solvencyRatio: 1.85, offices: 388, governmentOwned: false },
  { insurer: 'Future Generali', retailHealthPremiumCr: 183, retailClaimsRatioPct: 88.0, retailClaimsRatioPct3y: 97.9, solvencyRatio: 1.96, offices: 167, governmentOwned: false },
  { insurer: 'Royal Sundaram', retailHealthPremiumCr: 175, retailClaimsRatioPct: 87.4, retailClaimsRatioPct3y: 83.3, solvencyRatio: 2.20, offices: 145, governmentOwned: false },
  { insurer: 'Reliance General', retailHealthPremiumCr: 171, retailClaimsRatioPct: 82.2, retailClaimsRatioPct3y: 84.1, solvencyRatio: 1.59, offices: 128, governmentOwned: false },
  { insurer: 'Cholamandalam MS', retailHealthPremiumCr: 132, retailClaimsRatioPct: 102.5, retailClaimsRatioPct3y: 99.1, solvencyRatio: 2.18, offices: 198, governmentOwned: false },
];
