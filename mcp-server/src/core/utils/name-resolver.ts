import { fetchAllAccounts } from '../data/fetch-accounts.js';
import { fetchAllCategories } from '../data/fetch-categories.js';
import { fetchAllPayees } from '../data/fetch-payees.js';
import type { Account, Category, Payee } from '../types/domain.js';
import { isId, normalizeName } from './name-utils.js';

/**
 * Utility class for resolving entity names to IDs with caching support.
 * Handles both UUID pass-through and name-to-ID lookup for accounts, categories, and payees.
 */
export class NameResolver {
  private accountCache: Map<string, string> = new Map();

  private categoryCache: Map<string, string> = new Map();

  private payeeCache: Map<string, string> = new Map();

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
    if (isId(nameOrId)) {
      return nameOrId;
    }

    // Normalize the input for comparison (remove emojis, lowercase)
    const normalizedInput = normalizeName(nameOrId);

    // Check cache using normalized name
    if (this.accountCache.has(normalizedInput)) {
      return this.accountCache.get(normalizedInput)!;
    }

    // Fetch all accounts
    const accounts = await fetchAllAccounts();

    // Bulk warm the cache with all accounts to optimize subsequent lookups
    for (const account of accounts) {
      const normName = normalizeName(account.name);
      // Only set if not already present to preserve first-match behavior (similar to find)
      if (!this.accountCache.has(normName)) {
        this.accountCache.set(normName, account.id);
      }
    }

    // Check cache again after warming
    if (this.accountCache.has(normalizedInput)) {
      return this.accountCache.get(normalizedInput)!;
    }

    const availableAccounts = accounts.map((a: Account) => a.name).join(', ');
    throw new Error(
      `Account '${nameOrId}' not found. Available accounts: ${availableAccounts || 'none'}`,
    );
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
    if (isId(nameOrId)) {
      return nameOrId;
    }

    // Normalize the input for comparison (remove emojis, lowercase)
    const normalizedInput = normalizeName(nameOrId);

    // Check cache using normalized name
    if (this.categoryCache.has(normalizedInput)) {
      return this.categoryCache.get(normalizedInput)!;
    }

    // Fetch all categories
    const categories = await fetchAllCategories();

    // Bulk warm the cache with all categories
    for (const category of categories) {
      const normName = normalizeName(category.name);
      if (!this.categoryCache.has(normName)) {
        this.categoryCache.set(normName, category.id);
      }
    }

    // Check cache again
    if (this.categoryCache.has(normalizedInput)) {
      return this.categoryCache.get(normalizedInput)!;
    }

    const availableCategories = categories.map((c: Category) => c.name).join(', ');
    throw new Error(
      `Category '${nameOrId}' not found. Available categories: ${availableCategories || 'none'}`,
    );
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
    if (isId(nameOrId)) {
      return nameOrId;
    }

    // Normalize the input for comparison (remove emojis, lowercase)
    const normalizedInput = normalizeName(nameOrId);

    // Check cache using normalized name
    if (this.payeeCache.has(normalizedInput)) {
      return this.payeeCache.get(normalizedInput)!;
    }

    // Fetch all payees
    const payees = await fetchAllPayees();

    // Bulk warm the cache
    for (const payee of payees) {
      const normName = normalizeName(payee.name);
      if (!this.payeeCache.has(normName)) {
        this.payeeCache.set(normName, payee.id);
      }
    }

    // Check cache again
    if (this.payeeCache.has(normalizedInput)) {
      return this.payeeCache.get(normalizedInput)!;
    }

    const availablePayees = payees.map((p: Payee) => p.name).join(', ');
    throw new Error(
      `Payee '${nameOrId}' not found. Available payees: ${availablePayees || 'none'}`,
    );
  }

  /**
   * Clear all cached name-to-ID mappings.
   * Useful when entities are modified and cache needs to be invalidated.
   */
  clearCache(): void {
    this.accountCache.clear();
    this.categoryCache.clear();
    this.payeeCache.clear();
  }

  /**
   * Clear cached mappings for a specific entity type.
   *
   * @param entityType - Type of entity to clear cache for
   */
  clearCacheForType(entityType: 'account' | 'category' | 'payee'): void {
    switch (entityType) {
      case 'account':
        this.accountCache.clear();
        break;
      case 'category':
        this.categoryCache.clear();
        break;
      case 'payee':
        this.payeeCache.clear();
        break;
    }
  }
}

/**
 * Singleton instance of NameResolver for use across the application.
 */
export const nameResolver = new NameResolver();
