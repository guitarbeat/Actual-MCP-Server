
/**
 * Calculates the sum of values in an array derived by an iteratee.
 *
 * @param array - The array to iterate over
 * @param iteratee - The function invoked per iteration or property name
 * @returns The sum
 */
export function sumBy<T>(array: T[], iteratee: ((item: T) => number) | keyof T): number {
  return array.reduce((sum, item) => {
    const value = typeof iteratee === 'function'
      ? iteratee(item)
      : (item[iteratee] as unknown as number);
    // Handle null/undefined by treating as 0
    return sum + (value || 0);
  }, 0);
}
