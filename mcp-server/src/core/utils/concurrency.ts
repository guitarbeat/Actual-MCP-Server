const DEFAULT_CONCURRENCY_LIMIT = 4;

function normalizeConcurrencyLimit(requestedLimit?: number, itemCount?: number): number {
  const baseLimit = requestedLimit ?? DEFAULT_CONCURRENCY_LIMIT;
  const safeLimit = Number.isFinite(baseLimit) ? Math.max(1, Math.floor(baseLimit)) : 1;

  if (itemCount === undefined) {
    return safeLimit;
  }

  return Math.min(safeLimit, Math.max(1, itemCount));
}

export async function mapSettledWithConcurrency<T, TResult>(
  items: T[],
  worker: (item: T, index: number) => Promise<TResult>,
  requestedLimit?: number,
): Promise<Array<PromiseSettledResult<TResult>>> {
  if (items.length === 0) {
    return [];
  }

  const concurrencyLimit = normalizeConcurrencyLimit(requestedLimit, items.length);
  const results: Array<PromiseSettledResult<TResult>> = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: concurrencyLimit }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      try {
        const value = await worker(items[currentIndex], currentIndex);
        results[currentIndex] = {
          status: 'fulfilled',
          value,
        };
      } catch (reason) {
        results[currentIndex] = {
          status: 'rejected',
          reason,
        };
      }
    }
  });

  await Promise.all(workers);

  return results;
}
