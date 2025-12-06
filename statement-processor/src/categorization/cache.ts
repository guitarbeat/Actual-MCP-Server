/**
 * Caching for consistent transaction categorization
 * Ensures identical payees get the same category
 */

import { CategorySuggestion } from './types.js';

/**
 * Simple in-memory cache for category suggestions
 */
export class CategorizationCache {
  private cache: Map<string, CategorySuggestion>;
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.cache = new Map();
    this.enabled = enabled;
  }

  /**
   * Generate cache key from payee and amount
   * Amount is included to handle multi-purpose payees like BILTPYMTS
   */
  private generateKey(payee: string, amount: number): string {
    // Normalize payee (lowercase, trim)
    const normalizedPayee = payee.toLowerCase().trim();
    
    // For most payees, just use the payee name
    // For amount-sensitive payees, include amount range
    if (this.isAmountSensitivePayee(normalizedPayee)) {
      const amountRange = this.getAmountRange(amount);
      return `${normalizedPayee}:${amountRange}`;
    }
    
    return normalizedPayee;
  }

  /**
   * Check if a payee's category depends on amount
   */
  private isAmountSensitivePayee(payee: string): boolean {
    const amountSensitivePayees = ['bilt', 'biltpymts'];
    return amountSensitivePayees.some(p => payee.includes(p));
  }

  /**
   * Get amount range for caching (to group similar amounts)
   */
  private getAmountRange(amount: number): string {
    const absAmount = Math.abs(amount);
    
    if (absAmount < 100) return 'small';
    if (absAmount < 500) return 'medium';
    if (absAmount < 1000) return 'large';
    return 'xlarge';
  }

  /**
   * Get cached category suggestion
   */
  get(payee: string, amount: number): CategorySuggestion | null {
    if (!this.enabled) {
      return null;
    }

    const key = this.generateKey(payee, amount);
    return this.cache.get(key) || null;
  }

  /**
   * Store category suggestion in cache
   */
  set(payee: string, amount: number, suggestion: CategorySuggestion): void {
    if (!this.enabled) {
      return;
    }

    const key = this.generateKey(payee, amount);
    this.cache.set(key, suggestion);
  }

  /**
   * Check if a category is cached
   */
  has(payee: string, amount: number): boolean {
    if (!this.enabled) {
      return false;
    }

    const key = this.generateKey(payee, amount);
    return this.cache.has(key);
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; enabled: boolean } {
    return {
      size: this.cache.size,
      enabled: this.enabled,
    };
  }
}
