import { describe, it, expect } from 'vitest';
import { reviewOverdueMonths } from '../utils';

describe('reviewOverdueMonths', () => {
  const now = Date.parse('2026-10-16T00:00:00Z');
  it('is due once a year has passed, and not before', () => {
    expect(reviewOverdueMonths('2025-11-01T00:00:00Z', now)).toBeNull();
    expect(reviewOverdueMonths('2025-10-10T00:00:00Z', now)).toBe(12);
    expect(reviewOverdueMonths('2024-04-16T00:00:00Z', now)).toBe(30);
  });
  it('ignores a missing date', () => {
    expect(reviewOverdueMonths('', now)).toBeNull();
  });
});
