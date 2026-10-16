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
 * Insurers with too few claims for a stable ratio (under 1,000 life / 10,000 health claims) are omitted.
 */

export const INSURER_RECORDS_SOURCE = {
  period: 'FY 2024-25',
  publisher: 'IRDAI',
  documents: 'Handbook on Indian Insurance Statistics 2024-25 (Tables 15 and 53) and Annual Report 2024-25 (Statement 10)',
  url: 'https://irdai.gov.in/handbook-of-indian-insurance',
} as const;

export interface LifeInsurerRecord {
  insurer: string;
  claimsHandled: number;
  paidByNumberPct: number;
  paidByAmountPct: number;
}

export interface HealthInsurerRecord {
  insurer: string;
  claimsHandled: number;
  paidPct: number;
  repudiatedPct: number;
  /** Claims incurred as % of premium earned; very low means the insurer keeps more of the premium. */
  incurredClaimsRatioPct: number;
}

export const LIFE_INSURER_RECORDS: LifeInsurerRecord[] = [
  { insurer: 'Axis Max Life', claimsHandled: 20225, paidByNumberPct: 99.70, paidByAmountPct: 97.39 },
  { insurer: 'HDFC Life', claimsHandled: 19729, paidByNumberPct: 99.68, paidByAmountPct: 97.96 },
  { insurer: 'PNB MetLife', claimsHandled: 5639, paidByNumberPct: 99.57, paidByAmountPct: 99.30 },
  { insurer: 'Canara HSBC Life', claimsHandled: 2787, paidByNumberPct: 99.43, paidByAmountPct: 99.08 },
  { insurer: 'Tata AIA', claimsHandled: 8577, paidByNumberPct: 99.41, paidByAmountPct: 98.38 },
  { insurer: 'ICICI Prudential', claimsHandled: 12405, paidByNumberPct: 99.31, paidByAmountPct: 98.06 },
  { insurer: 'Bajaj Allianz Life', claimsHandled: 14094, paidByNumberPct: 99.29, paidByAmountPct: 93.04 },
  { insurer: 'Bharti AXA Life', claimsHandled: 2085, paidByNumberPct: 99.18, paidByAmountPct: 98.41 },
  { insurer: 'Reliance Nippon Life', claimsHandled: 8376, paidByNumberPct: 98.93, paidByAmountPct: 92.04 },
  { insurer: 'Star Union Dai-ichi', claimsHandled: 2413, paidByNumberPct: 98.84, paidByAmountPct: 96.93 },
  { insurer: 'Aditya Birla Sun Life', claimsHandled: 6361, paidByNumberPct: 98.65, paidByAmountPct: 96.22 },
  { insurer: 'Kotak Life', claimsHandled: 4678, paidByNumberPct: 98.61, paidByAmountPct: 95.88 },
  { insurer: 'Ageas Federal', claimsHandled: 1145, paidByNumberPct: 98.52, paidByAmountPct: 95.83 },
  { insurer: 'SBI Life', claimsHandled: 44949, paidByNumberPct: 98.34, paidByAmountPct: 95.26 },
  { insurer: 'Shriram Life', claimsHandled: 4852, paidByNumberPct: 98.31, paidByAmountPct: 81.71 },
  { insurer: 'IndiaFirst Life', claimsHandled: 3706, paidByNumberPct: 98.22, paidByAmountPct: 95.98 },
  { insurer: 'LIC', claimsHandled: 869086, paidByNumberPct: 97.59, paidByAmountPct: 96.08 },
];

export const HEALTH_INSURER_RECORDS: HealthInsurerRecord[] = [
  { insurer: 'Care Health', claimsHandled: 1508929, paidPct: 95.19, repudiatedPct: 3.10, incurredClaimsRatioPct: 64.53 },
  { insurer: 'Aditya Birla Health', claimsHandled: 2427651, paidPct: 94.09, repudiatedPct: 3.98, incurredClaimsRatioPct: 71.50 },
  { insurer: 'ManipalCigna', claimsHandled: 492746, paidPct: 93.06, repudiatedPct: 6.24, incurredClaimsRatioPct: 74.81 },
  { insurer: 'Niva Bupa', claimsHandled: 1039909, paidPct: 90.64, repudiatedPct: 7.30, incurredClaimsRatioPct: 61.22 },
  { insurer: 'Star Health', claimsHandled: 2575862, paidPct: 78.50, repudiatedPct: 12.33, incurredClaimsRatioPct: 70.30 },
];
