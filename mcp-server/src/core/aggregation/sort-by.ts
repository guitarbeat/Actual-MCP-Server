/**
 * Sorts an array based on the provided iteratees and sort orders.
 *
 * @param array - The array to sort
 * @param iteratees - Array of functions to get values to sort by
 * @param orders - Array of sort orders ('asc' or 'desc')
 * @returns The sorted array
 */
export function sortBy<T>(array: T[], iteratees: ((item: T) => unknown)[], orders: ('asc' | 'desc')[] = []): T[] {
  // Optimization: Fast path for single iteratee to avoid loop overhead
  if (iteratees.length === 1) {
    const iteratee = iteratees[0];
    const order = orders[0] || 'asc';
    const isAsc = order === 'asc';

    return [...array].sort((a, b) => {
      // biome-ignore lint/suspicious/noExplicitAny: Comparison of unknown types requires loose typing
      const valA = iteratee(a) as any;
      // biome-ignore lint/suspicious/noExplicitAny: Comparison of unknown types requires loose typing
      const valB = iteratee(b) as any;

      if (valA < valB) {
        return isAsc ? -1 : 1;
      }
      if (valA > valB) {
        return isAsc ? 1 : -1;
      }
      return 0;
    });
  }

  return [...array].sort((a, b) => {
    for (let i = 0; i < iteratees.length; i++) {
      const iteratee = iteratees[i];
      const order = orders[i] || 'asc';
      const valA = iteratee(a);
      const valB = iteratee(b);
      const result = compare(valA, valB, order);

      if (result !== 0) {
        return result;
      }
    }
    return 0;
  });
}

function compare(a: unknown, b: unknown, order: 'asc' | 'desc'): number {
  // biome-ignore lint/suspicious/noExplicitAny: Comparison of unknown types requires loose typing
  if ((a as any) < (b as any)) {
    return order === 'asc' ? -1 : 1;
  }
  // biome-ignore lint/suspicious/noExplicitAny: Comparison of unknown types requires loose typing
  if ((a as any) > (b as any)) {
    return order === 'asc' ? 1 : -1;
  }
  return 0;
}
