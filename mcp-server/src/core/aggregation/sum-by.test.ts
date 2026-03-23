import { describe, expect, it } from 'vitest';
import { sumBy } from './sum-by.js';

describe('sumBy', () => {
  it('should sum numbers using an iteratee function', () => {
    const data = [{ val: 1 }, { val: 2 }, { val: 3 }];
    expect(sumBy(data, (d) => d.val)).toBe(6);
  });

  it('should sum numbers using a key', () => {
    const data = [{ val: 10 }, { val: 20 }, { val: 30 }];
    expect(sumBy(data, 'val')).toBe(60);
  });

  it('should handle empty arrays', () => {
    expect(sumBy([], 'val')).toBe(0);
  });

  it('should treat null/undefined values as 0', () => {
    const data = [
      { val: 1 },
      { val: null as unknown as number },
      { val: undefined as unknown as number },
      { val: 2 },
    ];
    expect(sumBy(data, (d) => d.val)).toBe(3);
  });

  it('should handle negative numbers', () => {
    const data = [{ val: -10 }, { val: 5 }];
    expect(sumBy(data, 'val')).toBe(-5);
  });

  it('should handle NaN values as 0', () => {
    const data = [{ val: 1 }, { val: NaN }, { val: 3 }];
    expect(sumBy(data, 'val')).toBe(4);
  });

  it('should handle Infinity', () => {
    const data = [{ val: 1 }, { val: Infinity }];
    expect(sumBy(data, 'val')).toBe(Infinity);
  });

  it('should handle mixed types and strings by numeric coercion', () => {
    const data: Array<{ val: string | number }> = [{ val: '10' }, { val: 20 }];
    expect(sumBy(data, 'val')).toBe(30);

    const invalidData: Array<{ val: string | number }> = [{ val: 'abc' }, { val: 5 }];
    expect(sumBy(invalidData, 'val')).toBe(5);
  });
});
