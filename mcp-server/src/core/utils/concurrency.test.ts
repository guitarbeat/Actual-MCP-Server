import { describe, it, expect, vi } from 'vitest';
import { mapSettledWithConcurrency } from './concurrency.js';

describe('mapSettledWithConcurrency', () => {
  it('returns empty array when given no items', async () => {
    const worker = vi.fn();
    const result = await mapSettledWithConcurrency([], worker);
    expect(result).toEqual([]);
    expect(worker).not.toHaveBeenCalled();
  });

  it('resolves all items successfully', async () => {
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

  it('handles exceptions in worker, returning rejected status', async () => {
    const items = [1, 2, 3];
    const expectedError = new Error('Test Error');

    const worker = vi.fn(async (item: number) => {
      if (item === 2) {
        throw expectedError;
      }
      return item * 2;
    });

    const result = await mapSettledWithConcurrency(items, worker);

    expect(result).toEqual([
      { status: 'fulfilled', value: 2 },
      { status: 'rejected', reason: expectedError },
      { status: 'fulfilled', value: 6 },
    ]);
  });

  it('respects concurrency limit', async () => {
    const items = [1, 2, 3, 4, 5];
    let concurrentWorkers = 0;
    let maxConcurrentWorkers = 0;

    const worker = vi.fn(async (item: number) => {
      concurrentWorkers++;
      maxConcurrentWorkers = Math.max(maxConcurrentWorkers, concurrentWorkers);
      await new Promise((resolve) => setTimeout(resolve, 10));
      concurrentWorkers--;
      return item;
    });

    await mapSettledWithConcurrency(items, worker, 2);

    expect(maxConcurrentWorkers).toBeLessThanOrEqual(2);
    expect(worker).toHaveBeenCalledTimes(5);
  });
});
