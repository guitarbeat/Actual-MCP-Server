/**
 * Sorts an array based on iteratees and orders.
 *
 * @param array - The array to sort
 * @param iteratees - Array of functions to get values to sort by
 * @param orders - Array of sort orders ('asc' or 'desc')
 * @returns The sorted array
 */
export function sortBy<T>(array: T[], iteratees: ((item: T) => any)[], orders: ('asc' | 'desc')[] = []): T[] {
  return [...array].sort((a, b) => {
    for (let i = 0; i < iteratees.length; i++) {
      const iteratee = iteratees[i];
      const order = orders[i] || 'asc';
      const valA = iteratee(a);
      const valB = iteratee(b);

      if (valA < valB) {
        return order === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return order === 'asc' ? 1 : -1;
      }
    }
    return 0;
  });
}
