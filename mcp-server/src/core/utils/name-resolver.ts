import { fetchAllAccounts } from '../data/fetch-accounts.js';
import { fetchAllCategories } from '../data/fetch-categories.js';
import { fetchAllPayees } from '../data/fetch-payees.js';
import type { Account, Category, Payee } from '../types/domain.js';

// Pre-compiled regex for emoji removal
// Optimization: Moved to module level to avoid recompilation on every call
// Covers most emoji ranges: Emoticons, Miscellaneous Symbols, Dingbats, etc.
const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{200D}]|[\u{FE0F}]/gu;

/**
 * Utility class for resolving entity names to IDs with caching support.
 * Handles both UUID pass-through and name-to-ID lookup for accounts, categories, and payees.
 */
export class NameResolver {
  // Use WeakMap to associate the specific data array instance with its index.
  // This ensures that if the underlying data changes (new array reference from fetch*),
  // we automatically rebuild the index without manual invalidation.
  // Key: The source array (Account[], Category[], Payee[])
  // Value: Map of normalized name -> ID
  private accountIndex: WeakMap<object, Map<string, string>> = new WeakMap();
  private categoryIndex: WeakMap<object, Map<string, string>> = new WeakMap();
  private payeeIndex: WeakMap<object, Map<string, string>> = new WeakMap();

  /**
   * Check if a string looks like a UUID/ID (contains hyphens or is alphanumeric).
   * Actual Budget uses various ID formats, so we use a permissive check.
   *
   * @param value - String to check
   * @returns True if the value appears to be an ID
   */
  private isId(value: string): boolean {
    // IDs typically contain hyphens or are long alphanumeric strings
    // This is a permissive check to avoid false negatives
    return value.includes('-') || (value.length > 20 && /^[a-zA-Z0-9]+$/.test(value));
  }

  /**
   * Normalize a name for comparison by removing emojis and trimming whitespace.
   * This allows matching "Chase Checking" with "🏦 Chase Checking".
   *
   * @param name - Name to normalize
   * @returns Normalized name (lowercase, emojis removed, trimmed)
   */
  private normalizeName(name: string): string {
    return name.replace(EMOJI_REGEX, '').trim().toLowerCase();
  }

  /**
   * Get or create the index for a list of entities.
   *
   * @param list - The list of entities (Account[], Category[], or Payee[])
   * @param cache - The WeakMap cache for this entity type
   * @returns The Map of normalized name -> ID
   */
  private getIndex<T extends { id: string; name: string }>(
    list: T[],
    cache: WeakMap<object, Map<string, string>>
  ): Map<string, string> {
    let index = cache.get(list);
    if (!index) {
      index = new Map();
      for (const item of list) {
        // Handle potential duplicate normalized names by keeping the first one?
        // Or last one? Typically collisions shouldn't happen often.
        // We'll trust the first one found or overwrite.
        // Actually, let's just populate.
        index.set(this.normalizeName(item.name), item.id);
      }
      cache.set(list, index);
    }
    return index;
  }

  /**
   * Resolve an account name or ID to an account ID.
   * If the input is already an ID, it passes through unchanged.
   * If it's a name, looks up the corresponding account ID.
   *
   * @param nameOrId - Account name or ID
   * @returns Account ID
   * @throws Error if account is not found, with helpful message listing available accounts
   */
  async resolveAccount(nameOrId: string): Promise<string> {
    // Pass through if already an ID
    if (this.isId(nameOrId)) {
      return nameOrId;
    }

    const normalizedInput = this.normalizeName(nameOrId);
    const accounts = await fetchAllAccounts();
    const index = this.getIndex(accounts, this.accountIndex);

    const id = index.get(normalizedInput);

    if (id) {
      return id;
    }

    const availableAccounts = accounts.map((a: Account) => a.name).join(', ');
    throw new Error(`Account '${nameOrId}' not found. Available accounts: ${availableAccounts || 'none'}`);
  }

  /**
   * Resolve a category name or ID to a category ID.
   * If the input is already an ID, it passes through unchanged.
   * If it's a name, looks up the corresponding category ID.
   *
   * @param nameOrId - Category name or ID
   * @returns Category ID
   * @throws Error if category is not found, with helpful message listing available categories
   */
  async resolveCategory(nameOrId: string): Promise<string> {
    // Pass through if already an ID
    if (this.isId(nameOrId)) {
      return nameOrId;
    }

    const normalizedInput = this.normalizeName(nameOrId);
    const categories = await fetchAllCategories();
    const index = this.getIndex(categories, this.categoryIndex);

    const id = index.get(normalizedInput);

    if (id) {
      return id;
    }

    const availableCategories = categories.map((c: Category) => c.name).join(', ');
    throw new Error(`Category '${nameOrId}' not found. Available categories: ${availableCategories || 'none'}`);
  }

  /**
   * Resolve a payee name or ID to a payee ID.
   * If the input is already an ID, it passes through unchanged.
   * If it's a name, looks up the corresponding payee ID.
   *
   * @param nameOrId - Payee name or ID
   * @returns Payee ID
   * @throws Error if payee is not found, with helpful message listing available payees
   */
  async resolvePayee(nameOrId: string): Promise<string> {
    // Pass through if already an ID
    if (this.isId(nameOrId)) {
      return nameOrId;
    }

    const normalizedInput = this.normalizeName(nameOrId);
    const payees = await fetchAllPayees();
    const index = this.getIndex(payees, this.payeeIndex);

    const id = index.get(normalizedInput);

    if (id) {
      return id;
    }

    const availablePayees = payees.map((p: Payee) => p.name).join(', ');
    throw new Error(`Payee '${nameOrId}' not found. Available payees: ${availablePayees || 'none'}`);
  }

  /**
   * Clear all cached name-to-ID mappings.
   * Useful when entities are modified and cache needs to be invalidated.
   * @deprecated No longer needed as cache is tied to data array identity via WeakMap. Kept for backward compatibility.
   */
  clearCache(): void {
    // No-op with WeakMap implementation as it relies on object identity
  }

  /**
   * Clear cached mappings for a specific entity type.
   *
   * @param entityType - Type of entity to clear cache for
   * @deprecated No longer needed as cache is tied to data array identity via WeakMap.
   */
  clearCacheForType(_entityType: 'account' | 'category' | 'payee'): void {
    // No-op
  }
}

/**
 * Singleton instance of NameResolver for use across the application.
 */
export const nameResolver = new NameResolver();
