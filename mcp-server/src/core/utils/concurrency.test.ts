import { describe, expect, it, vi } from 'vitest';
import { mapSettledWithConcurrency } from './concurrency.js';

describe('mapSettledWithConcurrency', () => {
  it('should return an empty array immediately when given an empty array', async () => {
    const worker = vi.fn();
    const result = await mapSettledWithConcurrency([], worker);
    expect(result).toEqual([]);
    expect(worker).not.toHaveBeenCalled();
  });

  it('should successfully map items', async () => {
    const items = [1, 2, 3];
    const worker = async (item: number) => item * 2;
    const result = await mapSettledWithConcurrency(items, worker);

    expect(result).toEqual([
      { status: 'fulfilled', value: 2 },
      { status: 'fulfilled', value: 4 },
      { status: 'fulfilled', value: 6 },
    ]);
  });

  it('should handle rejected promises', async () => {
    const items = [1, 2, 3];
    const worker = async (item: number) => {
      if (item === 2) {
        throw new Error('Test error');
      }
      return item * 2;
    };

    const result = await mapSettledWithConcurrency(items, worker);

    expect(result).toEqual([
      { status: 'fulfilled', value: 2 },
      { status: 'rejected', reason: new Error('Test error') },
      { status: 'fulfilled', value: 6 },
    ]);
  });

  it('should respect concurrency limits', async () => {
    const items = [1, 2, 3, 4, 5];
    let activeWorkers = 0;
    let maxWorkers = 0;

    const worker = async (item: number) => {
      activeWorkers++;
      maxWorkers = Math.max(maxWorkers, activeWorkers);
      // simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));
      activeWorkers--;
      return item;
    };

    const limit = 2;
    await mapSettledWithConcurrency(items, worker, limit);

    expect(maxWorkers).toBeLessThanOrEqual(limit);
  });
});
