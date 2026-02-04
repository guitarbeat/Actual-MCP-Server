/**
 * Sorts an array based on the provided iteratees and sort orders.
 *
 * @param array - The array to sort
 * @param iteratees - Array of functions to get values to sort by
 * @param orders - Array of sort orders ('asc' or 'desc')
 * @returns The sorted array
 */
export function sortBy<T>(array: T[], iteratees: ((item: T) => unknown)[], orders: ('asc' | 'desc')[] = []): T[] {
  // Optimization: Fast path for single iteratee
  // Performance impact: avoids loop overhead and function call overhead for the most common case
  if (iteratees.length === 1) {
    const iteratee = iteratees[0];
    const order = orders[0] || 'asc';

    return [...array].sort((a, b) => {
      const valA = iteratee(a);
      const valB = iteratee(b);

      // Inline comparison for performance
      // biome-ignore lint/suspicious/noExplicitAny: Comparison of unknown types requires loose typing
      if ((valA as any) < (valB as any)) {
        return order === 'asc' ? -1 : 1;
      }
      // biome-ignore lint/suspicious/noExplicitAny: Comparison of unknown types requires loose typing
      if ((valA as any) > (valB as any)) {
        return order === 'asc' ? 1 : -1;
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
