import { describe, it, expect } from 'vitest';
import { hashPassword, hashPasswordAsync } from '../db/database.js';

describe('password hashing', () => {
  it('async hashing matches the stored sync format, so existing passwords keep working', async () => {
    for (const [pw, salt] of [['Password123!', 'a1b2'], ['पासवर्ड', 'salt'], ['', 'x']]) {
      expect(await hashPasswordAsync(pw, salt)).toBe(hashPassword(pw, salt));
    }
  });

  it('does not block other work while hashing', async () => {
    let finished = 0;
    const hashes = Array.from({ length: 8 }, (_, i) => hashPasswordAsync(`pw${i}`, `salt${i}`).then(() => finished++));
    // A blocking implementation completes all 8 before this timer can run.
    const finishedWhenTimerRan = await new Promise<number>(resolve => setTimeout(() => resolve(finished), 0));
    await Promise.all(hashes);
    expect(finishedWhenTimerRan).toBeLessThan(8);
    expect(finished).toBe(8);
  });
});
