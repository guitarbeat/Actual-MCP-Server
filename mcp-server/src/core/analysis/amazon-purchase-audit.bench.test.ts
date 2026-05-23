import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as actualClient from '../api/actual-client.js';

vi.mock('../api/actual-client.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/actual-client.js')>();
  return {
    ...actual,
    createCategory: vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return `new_cat_id_${Math.random()}`;
    }),
    getCategories: vi.fn().mockResolvedValue([]),
    getCategoryGroups: vi.fn().mockResolvedValue([{ id: 'group_id_1', name: 'Group 1' }]),
    updateTransaction: vi.fn().mockResolvedValue(undefined),
  };
});

describe('Amazon Audit N+1 Benchmark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('measures creating categories', async () => {
    // This is a placeholder test. Since the actual method takes a lot of mocked inputs,
    // we'll run a quick baseline with the original code, then we'll run it again after.
    const numLookups = 10;
    const start = performance.now();

    // Simulate the N+1 loop behavior using the mock
    const targetCategoryNames = Array.from({ length: numLookups }, (_, i) => `Cat ${i}`);

    for (const name of targetCategoryNames) {
      await actualClient.createCategory({ name, group_id: 'group_id_1' });
    }

    const duration = performance.now() - start;
    console.log(`[PERF BASELINE] N+1 Category Creation: ${duration.toFixed(2)}ms`);
    expect(duration).toBeGreaterThan(0);
  });
});
