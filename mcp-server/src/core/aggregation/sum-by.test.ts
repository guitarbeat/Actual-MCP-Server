import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
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

  it('should handle objects missing the specified key', () => {
    // Objects missing 'val' will yield undefined for that property, which should be treated as 0
    const data = [{ val: 10 }, { other: 20 } as unknown as { val: number }, { val: 30 }];
    expect(sumBy(data, 'val')).toBe(40);
  });

  it('should handle boolean coercion correctly', () => {
    // true -> 1, false -> 0
    const data = [
      { val: true as unknown as number },
      { val: false as unknown as number },
      { val: true as unknown as number },
    ];
    expect(sumBy(data, 'val')).toBe(2);
  });

  describe('property-based tests', () => {
    it('should match native reduce logic for function iteratees', () => {
      fc.assert(
        fc.property(fc.array(fc.record({ val: fc.double({ noNaN: true }) })), (arr) => {
          const expected = arr.reduce((sum, item) => sum + item.val, 0);
          expect(sumBy(arr, (d) => d.val)).toBeCloseTo(expected, 10);
        }),
      );
    });

    it.skip('should match native reduce logic for key iteratees', () => {
      fc.assert(
        fc.property(fc.array(fc.record({ val: fc.double({ noNaN: true }) })), (arr) => {
          const expected = arr.reduce((sum, item) => sum + item.val, 0);
          expect(sumBy(arr, 'val')).toBeCloseTo(expected, 10);
        }),
      );
    });
  });
});
