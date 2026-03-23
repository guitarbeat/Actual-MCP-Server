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


  it('should preserve original order for equivalent items with a single iteratee (stable sort)', () => {
    const data = [
      { val: 1, id: 'a' },
      { val: 2, id: 'b' },
      { val: 1, id: 'c' },
    ];
    const result = sortBy(data, [(d) => d.val]);
    expect(result).toEqual([
      { val: 1, id: 'a' },
      { val: 1, id: 'c' },
      { val: 2, id: 'b' },
    ]);
  });


  it('should preserve original order for equivalent items with multiple iteratees (stable sort)', () => {
    const data = [
      { g: 'a', v: 1, id: 'first' },
      { g: 'a', v: 2, id: 'middle' },
      { g: 'a', v: 1, id: 'second' },
    ];
    // Sort by g (asc), then v (asc)
    const result = sortBy(data, [(d) => d.g, (d) => d.v]);
    expect(result).toEqual([
      { g: 'a', v: 1, id: 'first' },
      { g: 'a', v: 1, id: 'second' },
      { g: 'a', v: 2, id: 'middle' },
    ]);
  });


  it('should support multiple iteratees descending', () => {
    const data = [
      { group: 'a', val: 1 },
      { group: 'b', val: 2 },
      { group: 'a', val: 2 },
    ];
    // Sort by group (desc), then val (desc)
    const result = sortBy(data, [(d) => d.group, (d) => d.val], ['desc', 'desc']);
    expect(result).toEqual([
      { group: 'b', val: 2 },
      { group: 'a', val: 2 },
      { group: 'a', val: 1 },
    ]);
  });
});
