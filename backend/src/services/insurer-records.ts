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
 * Insurers with too few claims for a stable ratio (under 1,000 life / 10,000 health claims) are omitted.
 */

export const INSURER_RECORDS_SOURCE = {
  period: 'FY 2024-25',
  publisher: 'IRDAI',
  documents: 'Handbook on Indian Insurance Statistics 2024-25 (Tables 10, 15, 18, 23, 29, 37, 49, 53, 54, 56, 58) and Annual Report 2024-25 (Statement 10)',
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
}

export const LIFE_INSURER_RECORDS: LifeInsurerRecord[] = [
  { insurer: 'Axis Max Life', claimsHandled: 20225, paidByNumberPct: 99.70, paidByAmountPct: 97.39, settledWithin30DaysPct: 94.4, complaintsPer10kPolicies: 9.2, solvencyRatio: 2.01, offices: 404 },
  { insurer: 'HDFC Life', claimsHandled: 19729, paidByNumberPct: 99.68, paidByAmountPct: 97.96, settledWithin30DaysPct: 100.0, complaintsPer10kPolicies: 5.7, solvencyRatio: 1.94, offices: 652 },
  { insurer: 'PNB MetLife', claimsHandled: 5639, paidByNumberPct: 99.57, paidByAmountPct: 99.30, settledWithin30DaysPct: 100.0, complaintsPer10kPolicies: 11.8, solvencyRatio: 1.72, offices: 155 },
  { insurer: 'Canara HSBC Life', claimsHandled: 2787, paidByNumberPct: 99.43, paidByAmountPct: 99.08, settledWithin30DaysPct: 89.1, complaintsPer10kPolicies: 10.8, solvencyRatio: 2.06, offices: 104 },
  { insurer: 'Tata AIA', claimsHandled: 8577, paidByNumberPct: 99.41, paidByAmountPct: 98.38, settledWithin30DaysPct: 98.7, complaintsPer10kPolicies: 7.9, solvencyRatio: 1.80, offices: 612 },
  { insurer: 'ICICI Prudential', claimsHandled: 12405, paidByNumberPct: 99.31, paidByAmountPct: 98.06, settledWithin30DaysPct: 98.1, complaintsPer10kPolicies: 6.6, solvencyRatio: 2.12, offices: 459 },
  { insurer: 'Bajaj Allianz Life', claimsHandled: 14094, paidByNumberPct: 99.29, paidByAmountPct: 93.04, settledWithin30DaysPct: 93.9, complaintsPer10kPolicies: 8.7, solvencyRatio: 3.59, offices: 596 },
  { insurer: 'Bharti AXA Life', claimsHandled: 2085, paidByNumberPct: 99.18, paidByAmountPct: 98.41, settledWithin30DaysPct: 94.0, complaintsPer10kPolicies: 51.8, solvencyRatio: 1.67, offices: 212 },
  { insurer: 'Reliance Nippon Life', claimsHandled: 8376, paidByNumberPct: 98.93, paidByAmountPct: 92.04, settledWithin30DaysPct: 95.3, complaintsPer10kPolicies: 5.5, solvencyRatio: 2.35, offices: 712 },
  { insurer: 'Star Union Dai-ichi', claimsHandled: 2413, paidByNumberPct: 98.84, paidByAmountPct: 96.93, settledWithin30DaysPct: 99.2, complaintsPer10kPolicies: 14.4, solvencyRatio: 2.30, offices: 172 },
  { insurer: 'Aditya Birla Sun Life', claimsHandled: 6361, paidByNumberPct: 98.65, paidByAmountPct: 96.22, settledWithin30DaysPct: 100.0, complaintsPer10kPolicies: 6.4, solvencyRatio: 1.88, offices: 444 },
  { insurer: 'Kotak Life', claimsHandled: 4678, paidByNumberPct: 98.61, paidByAmountPct: 95.88, settledWithin30DaysPct: 94.0, complaintsPer10kPolicies: 7.6, solvencyRatio: 2.45, offices: 323 },
  { insurer: 'Ageas Federal', claimsHandled: 1145, paidByNumberPct: 98.52, paidByAmountPct: 95.83, settledWithin30DaysPct: 97.2, complaintsPer10kPolicies: 7.3, solvencyRatio: 2.70, offices: 79 },
  { insurer: 'SBI Life', claimsHandled: 44949, paidByNumberPct: 98.34, paidByAmountPct: 95.26, settledWithin30DaysPct: 99.1, complaintsPer10kPolicies: 2.4, solvencyRatio: 1.96, offices: 1110 },
  { insurer: 'Shriram Life', claimsHandled: 4852, paidByNumberPct: 98.31, paidByAmountPct: 81.71, settledWithin30DaysPct: 100.0, complaintsPer10kPolicies: 16.4, solvencyRatio: 1.79, offices: 537 },
  { insurer: 'IndiaFirst Life', claimsHandled: 3706, paidByNumberPct: 98.22, paidByAmountPct: 95.98, settledWithin30DaysPct: 87.0, complaintsPer10kPolicies: 12.9, solvencyRatio: 2.00, offices: 65 },
  { insurer: 'LIC', claimsHandled: 869086, paidByNumberPct: 97.59, paidByAmountPct: 96.08, settledWithin30DaysPct: 97.1, complaintsPer10kPolicies: 2.8, solvencyRatio: 2.11, offices: 5004 },
];

export const HEALTH_INSURER_RECORDS: HealthInsurerRecord[] = [
  { insurer: 'Care Health', claimsHandled: 1508929, paidPct: 95.19, repudiatedPct: 3.10, incurredClaimsRatioPct: 64.53, complaintsPer10kPolicies: 37.3, solvencyRatio: 1.68, offices: 269 },
  { insurer: 'Aditya Birla Health', claimsHandled: 2427651, paidPct: 94.09, repudiatedPct: 3.98, incurredClaimsRatioPct: 71.50, complaintsPer10kPolicies: 46.7, solvencyRatio: 1.84, offices: 225 },
  { insurer: 'ManipalCigna', claimsHandled: 492746, paidPct: 93.06, repudiatedPct: 6.24, incurredClaimsRatioPct: 74.81, complaintsPer10kPolicies: 53.0, solvencyRatio: 1.76, offices: 104 },
  { insurer: 'Niva Bupa', claimsHandled: 1039909, paidPct: 90.64, repudiatedPct: 7.30, incurredClaimsRatioPct: 61.22, complaintsPer10kPolicies: 33.0, solvencyRatio: 3.03, offices: 212 },
  { insurer: 'Star Health', claimsHandled: 2575862, paidPct: 78.50, repudiatedPct: 12.33, incurredClaimsRatioPct: 70.30, complaintsPer10kPolicies: 24.6, solvencyRatio: 2.21, offices: 913 },
];
