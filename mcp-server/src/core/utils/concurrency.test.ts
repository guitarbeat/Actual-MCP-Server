import { describe, it, expect, vi } from 'vitest';
import { mapSettledWithConcurrency } from './concurrency.js';

describe('mapSettledWithConcurrency', () => {
  it('returns an empty array when given an empty input array', async () => {
    const worker = vi.fn().mockResolvedValue('success');
    const result = await mapSettledWithConcurrency([], worker);

    expect(result).toEqual([]);
    expect(worker).not.toHaveBeenCalled();
  });

  it('processes all items successfully', async () => {
    const items = [1, 2, 3];
    const worker = vi.fn(async (item: number) => item * 2);

    const result = await mapSettledWithConcurrency(items, worker);

    expect(result).toEqual([
      { status: 'fulfilled', value: 2 },
      { status: 'fulfilled', value: 4 },
      { status: 'fulfilled', value: 6 },
    ]);
    expect(worker).toHaveBeenCalledTimes(3);
  });

  it('handles mixed fulfilled and rejected promises', async () => {
    const items = [1, 2, 3];
    const worker = vi.fn(async (item: number) => {
      if (item === 2) {
        throw new Error('Failed');
      }
      return item * 2;
    });

    const result = await mapSettledWithConcurrency(items, worker);

    expect(result).toEqual([
      { status: 'fulfilled', value: 2 },
      { status: 'rejected', reason: new Error('Failed') },
      { status: 'fulfilled', value: 6 },
    ]);
    expect(worker).toHaveBeenCalledTimes(3);
  });

  it('handles synchronous exceptions as rejections', async () => {
    const items = [1, 2, 3];
    const worker = vi.fn((item: number) => {
      if (item === 2) {
        throw new Error('Sync error');
      }
      return Promise.resolve(item * 2);
    });

    const result = await mapSettledWithConcurrency(items, worker);

    expect(result).toEqual([
      { status: 'fulfilled', value: 2 },
      { status: 'rejected', reason: new Error('Sync error') },
      { status: 'fulfilled', value: 6 },
    ]);
    expect(worker).toHaveBeenCalledTimes(3);
  });

  it('passes correct index to the worker function', async () => {
    const items = ['a', 'b', 'c'];
    const worker = vi.fn(async (item: string, index: number) => ({ item, index }));

    const result = await mapSettledWithConcurrency(items, worker);

    expect(result).toEqual([
      { status: 'fulfilled', value: { item: 'a', index: 0 } },
      { status: 'fulfilled', value: { item: 'b', index: 1 } },
      { status: 'fulfilled', value: { item: 'c', index: 2 } },
    ]);
  });

  it('respects the concurrency limit', async () => {
    const items = [1, 2, 3, 4, 5];
    let activeWorkers = 0;
    let maxActiveWorkers = 0;

    const worker = vi.fn(async (item: number) => {
      activeWorkers++;
      maxActiveWorkers = Math.max(maxActiveWorkers, activeWorkers);

      // Simulate some async work
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });

      activeWorkers--;
      return item;
    });

    const limit = 2;
    await mapSettledWithConcurrency(items, worker, limit);

    expect(worker).toHaveBeenCalledTimes(5);
    expect(maxActiveWorkers).toBeLessThanOrEqual(limit);
  });

  it('normalizes invalid or negative concurrency limits', async () => {
    const items = [1, 2, 3];

    const testCases = [
      { limit: 0, expectedMaxActive: 1 },
      { limit: -5, expectedMaxActive: 1 },
      { limit: NaN, expectedMaxActive: 1 },
      { limit: undefined, expectedMaxActive: 3 }, // Math.min(4, 3) = 3
    ];

    for (const { limit, expectedMaxActive } of testCases) {
      let activeWorkers = 0;
      let maxActiveWorkers = 0;

      const worker = vi.fn(async (item: number) => {
        activeWorkers++;
        maxActiveWorkers = Math.max(maxActiveWorkers, activeWorkers);
        await new Promise((resolve) => {
          setTimeout(resolve, 10);
        });
        activeWorkers--;
        return item;
      });

      await mapSettledWithConcurrency(items, worker, limit);

      expect(maxActiveWorkers).toBeLessThanOrEqual(expectedMaxActive);
    }
  });

  it('strictly respects concurrency using deferred promises', async () => {
    const items = [1, 2, 3, 4, 5];
    const limit = 2;

    type Deferred = { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
    const deferreds: Deferred[] = [];

    const worker = vi.fn((_item: number) => {
      return new Promise((resolve, reject) => {
        deferreds.push({ resolve, reject });
      });
    });

    const promise = mapSettledWithConcurrency(items, worker, limit);

    // Initial state: should only start `limit` number of workers
    expect(worker).toHaveBeenCalledTimes(2);
    expect(deferreds.length).toBe(2);

    // Resolve first worker
    deferreds[0].resolve(1);
    // Wait for the next tick to allow next worker to start
    await Promise.resolve();

    // Now third worker should have started
    expect(worker).toHaveBeenCalledTimes(3);
    expect(deferreds.length).toBe(3);

    // Resolve remaining
    deferreds[1].resolve(2);
    deferreds[2].resolve(3);
    await Promise.resolve();

    expect(worker).toHaveBeenCalledTimes(5);

    deferreds[3].resolve(4);
    deferreds[4].resolve(5);

    const result = await promise;
    expect(result.length).toBe(5);
    expect(result[0].status).toBe('fulfilled');
  });
});
