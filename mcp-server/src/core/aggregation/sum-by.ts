
/**
 * Calculates the sum of values in an array derived by an iteratee.
 *
 * @param array - The array to iterate over
 * @param iteratee - The function invoked per iteration or property name
 * @returns The sum
 */
export function sumBy<T>(array: T[], iteratee: ((item: T) => number) | keyof T): number {
  let sum = 0;

  // Use a standard loop instead of reduce for better performance on large arrays
  // and hoist the type check to avoid checking it on every iteration.
  if (typeof iteratee === 'function') {
    for (const item of array) {
      const value = iteratee(item);
      if (value) {
        sum += value;
      }
    }
  } else {
    for (const item of array) {
      // Cast to unknown then number to handle potential runtime type mismatches
      // gracefully (e.g., if the property exists but is null/undefined)
      const value = item[iteratee] as unknown as number;
      if (value) {
        sum += value;
      }
    }
  }

  return sum;
}
