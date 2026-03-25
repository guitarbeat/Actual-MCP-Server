import { describe, expect, it } from 'vitest';
import { getCurrentMonth } from './current-month.js';

describe('getCurrentMonth', () => {
  it('uses local calendar fields instead of UTC ISO formatting', () => {
    const localFebruaryDate = {
      getFullYear: () => 2026,
      getMonth: () => 1,
    };

    expect(getCurrentMonth(localFebruaryDate)).toBe('2026-02');
  });
});
