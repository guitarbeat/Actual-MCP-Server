import { describe, expect, it } from 'vitest';
import { sortBy } from './sort-by.js';

describe('sortBy', () => {
  it('should sort by a single property ascending (default)', () => {
    const data = [{ val: 3 }, { val: 1 }, { val: 2 }];
    const result = sortBy(data, [(d) => d.val]);
    expect(result).toEqual([{ val: 1 }, { val: 2 }, { val: 3 }]);
  });

  it('should sort by a single property descending', () => {
    const data = [{ val: 1 }, { val: 3 }, { val: 2 }];
    const result = sortBy(data, [(d) => d.val], ['desc']);
    expect(result).toEqual([{ val: 3 }, { val: 2 }, { val: 1 }]);
  });

  it('should sort by multiple properties', () => {
    const data = [
      { group: 'a', val: 2 },
      { group: 'b', val: 1 },
      { group: 'a', val: 1 },
    ];
    // Sort by group (asc), then val (asc)
    const result = sortBy(data, [(d) => d.group, (d) => d.val]);
    expect(result).toEqual([
      { group: 'a', val: 1 },
      { group: 'a', val: 2 },
      { group: 'b', val: 1 },
    ]);
  });

  it('should support mixed sort orders', () => {
    const data = [
      { group: 'a', val: 1 },
      { group: 'a', val: 2 },
      { group: 'b', val: 1 },
    ];
    // Sort by group (desc), then val (asc)
    const result = sortBy(data, [(d) => d.group, (d) => d.val], ['desc', 'asc']);
    expect(result).toEqual([
      { group: 'b', val: 1 },
      { group: 'a', val: 1 },
      { group: 'a', val: 2 },
    ]);
  });

  it('should return a new array and not mutate the original', () => {
    const data = [{ val: 2 }, { val: 1 }];
    const result = sortBy(data, [(d) => d.val]);
    expect(result).not.toBe(data);
    expect(data[0].val).toBe(2); // Original order preserved
    expect(result[0].val).toBe(1);
  });

  it('should handle empty arrays', () => {
    expect(sortBy([], [])).toEqual([]);
  });
});
