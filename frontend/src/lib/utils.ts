import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { SavedPlan } from "./api"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** ₹ in Lakh/Crore, e.g. ₹2.68 Cr, ₹45.0L, ₹85,000. Negative values keep their sign. */
export function formatINR(value: number): string {
  const sign = value < 0 ? "-" : ""
  const n = Math.abs(value)
  if (n >= 1e7) return `${sign}₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `${sign}₹${(n / 1e5).toFixed(1)}L`
  return `${sign}₹${Math.round(n).toLocaleString("en-IN")}`
}

// Neutralises spreadsheet formula injection (=, +, -, @) and quotes every field.
export function toCsv(plans: SavedPlan[]): string {
    const cell = (v: string | number) => {
        let text = String(v);
        if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
    };
    const header = ['ID', 'Name', 'Category', 'Coverage (INR)', 'Monthly Premium (INR)', 'Status', 'Last Modified', 'Description'];
    const rows = plans.map(p => [p.id, p.name, p.category, p.coverageAmount, p.monthlyPremium, p.status, p.lastModified, p.description]);
    return [header, ...rows].map(r => r.map(cell).join(',')).join('\r\n');
}

/** Display name for the configured AI provider id returned by the API. */
export function providerLabel(provider: string | null | undefined): string {
  return provider === "gemini" ? "Google Gemini" : provider === "openai" ? "OpenAI" : provider ?? ""
}

/** Cover should be reviewed at least yearly. Returns whole months since the last review once it is due, else null. */
export function reviewOverdueMonths(reviewedAt: string, now = Date.now()): number | null {
  const then = new Date(reviewedAt);
  if (!reviewedAt || Number.isNaN(then.getTime())) return null;
  const today = new Date(now);
  // Calendar months, counting a month only once its day has come round.
  const months = (today.getUTCFullYear() - then.getUTCFullYear()) * 12 + today.getUTCMonth() - then.getUTCMonth()
    - (today.getUTCDate() < then.getUTCDate() ? 1 : 0);
  return months >= 12 ? months : null;
}
