import { fetchAllAccounts } from '../data/fetch-accounts.js';
import { fetchAllCategories } from '../data/fetch-categories.js';
import { fetchAllPayees } from '../data/fetch-payees.js';
import type { Account, Category, Payee } from '../types/domain.js';

/**
 * Utility class for resolving entity names to IDs with caching support.
 * Handles both UUID pass-through and name-to-ID lookup for accounts, categories, and payees.
 */
export class NameResolver {
  private accountCache: Map<string, string> = new Map();
  private categoryCache: Map<string, string> = new Map();
  private payeeCache: Map<string, string> = new Map();

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

    // Check cache
    if (this.accountCache.has(nameOrId.toLowerCase())) {
      return this.accountCache.get(nameOrId.toLowerCase())!;
    }

    // Fetch and search
    const accounts = await fetchAllAccounts();
    const account = accounts.find((a: Account) => a.name.toLowerCase() === nameOrId.toLowerCase());

    if (!account) {
      const availableAccounts = accounts.map((a: Account) => a.name).join(', ');
      throw new Error(`Account '${nameOrId}' not found. Available accounts: ${availableAccounts || 'none'}`);
    }

    // Cache the result
    this.accountCache.set(nameOrId.toLowerCase(), account.id);
    return account.id;
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

    // Check cache
    if (this.categoryCache.has(nameOrId.toLowerCase())) {
      return this.categoryCache.get(nameOrId.toLowerCase())!;
    }

    // Fetch and search
    const categories = await fetchAllCategories();
    const category = categories.find((c: Category) => c.name.toLowerCase() === nameOrId.toLowerCase());

    if (!category) {
      const availableCategories = categories.map((c: Category) => c.name).join(', ');
      throw new Error(`Category '${nameOrId}' not found. Available categories: ${availableCategories || 'none'}`);
    }

    // Cache the result
    this.categoryCache.set(nameOrId.toLowerCase(), category.id);
    return category.id;
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

    // Check cache
    if (this.payeeCache.has(nameOrId.toLowerCase())) {
      return this.payeeCache.get(nameOrId.toLowerCase())!;
    }

    // Fetch and search
    const payees = await fetchAllPayees();
    const payee = payees.find((p: Payee) => p.name.toLowerCase() === nameOrId.toLowerCase());

    if (!payee) {
      const availablePayees = payees.map((p: Payee) => p.name).join(', ');
      throw new Error(`Payee '${nameOrId}' not found. Available payees: ${availablePayees || 'none'}`);
    }

    // Cache the result
    this.payeeCache.set(nameOrId.toLowerCase(), payee.id);
    return payee.id;
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
