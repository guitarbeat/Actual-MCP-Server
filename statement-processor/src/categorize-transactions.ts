/**
 * Main categorization engine that orchestrates pattern matching, LLM calls, and caching
 */

import { ChaseTransaction, CategorySuggestion } from './types.js';
import { LLMClient } from './llm-client.js';
import { CategorizationCache } from './categorization-cache.js';
import { categorizeByPattern, shouldSkipLLM } from './categorize-with-patterns.js';
import { categorizeWithLLM } from './categorize-with-llm.js';
import { cleanPayeeName } from './clean-payee-name.js';
import { CSVImportError } from './handle-errors.js';

export interface CategorizationEngineConfig {
  llmClient: LLMClient;
  enableCaching: boolean;
  batchSize: number;
  rateLimitDelay: number; // milliseconds between batches
}

export interface CategorizationProgress {
  total: number;
  processed: number;
  cached: number;
  patternMatched: number;
  llmCategorized: number;
}

/**
 * Categorization engine with batch processing and progress reporting
 */
export class CategorizationEngine {
  private llmClient: LLMClient;
  private cache: CategorizationCache;
  private batchSize: number;
  private rateLimitDelay: number;

  constructor(config: CategorizationEngineConfig) {
    this.llmClient = config.llmClient;
    this.cache = new CategorizationCache(config.enableCaching);
    this.batchSize = config.batchSize;
    this.rateLimitDelay = config.rateLimitDelay;
  }

  /**
   * Categorize a single transaction with fallback on LLM errors
   */
  async categorizeTransaction(
    transaction: ChaseTransaction,
    cleanedPayee: string
  ): Promise<CategorySuggestion> {
    // Check cache first
    const cached = this.cache.get(cleanedPayee, transaction.amount);
    if (cached) {
      return cached;
    }

    // Try pattern matching
    const patternMatch = categorizeByPattern(transaction, cleanedPayee);
    if (patternMatch && shouldSkipLLM(patternMatch)) {
      const suggestion: CategorySuggestion = {
        category: patternMatch.category,
        confidence: patternMatch.confidence,
        reasoning: 'Pattern matched',
      };
      this.cache.set(cleanedPayee, transaction.amount, suggestion);
      return suggestion;
    }

    // Use LLM for categorization with fallback
    try {
      const suggestion = await categorizeWithLLM(transaction, cleanedPayee, this.llmClient);
      this.cache.set(cleanedPayee, transaction.amount, suggestion);
      return suggestion;
    } catch (error) {
      // Fallback to pattern match or uncategorized on LLM error
      console.warn(`⚠️  LLM categorization failed for "${cleanedPayee}", using fallback`);
      
      if (patternMatch) {
        // Use pattern match even if confidence is low
        const fallbackSuggestion: CategorySuggestion = {
          category: patternMatch.category,
          confidence: 'low',
          reasoning: 'Fallback to pattern match due to LLM error',
        };
        this.cache.set(cleanedPayee, transaction.amount, fallbackSuggestion);
        return fallbackSuggestion;
      }
      
      // Last resort: uncategorized
      const uncategorizedSuggestion: CategorySuggestion = {
        category: 'Uncategorized',
        confidence: 'low',
        reasoning: 'LLM error and no pattern match available',
      };
      this.cache.set(cleanedPayee, transaction.amount, uncategorizedSuggestion);
      return uncategorizedSuggestion;
    }
  }

  /**
   * Categorize multiple transactions in batches with progress reporting
   */
  async categorizeTransactions(
    transactions: ChaseTransaction[],
    onProgress?: (progress: CategorizationProgress) => void
  ): Promise<Map<ChaseTransaction, CategorySuggestion>> {
    const results = new Map<ChaseTransaction, CategorySuggestion>();
    const progress: CategorizationProgress = {
      total: transactions.length,
      processed: 0,
      cached: 0,
      patternMatched: 0,
      llmCategorized: 0,
    };

    // Process in batches
    for (let i = 0; i < transactions.length; i += this.batchSize) {
      const batch = transactions.slice(i, i + this.batchSize);
      
      // Process batch concurrently
      const batchPromises = batch.map(async (transaction) => {
        const cleanedPayee = cleanPayeeName(transaction.description, transaction.type).payee;
        
        // Check if cached
        const cached = this.cache.get(cleanedPayee, transaction.amount);
        if (cached) {
          progress.cached++;
          return { transaction, suggestion: cached };
        }

        // Try pattern matching
        const patternMatch = categorizeByPattern(transaction, cleanedPayee);
        if (patternMatch && shouldSkipLLM(patternMatch)) {
          const suggestion: CategorySuggestion = {
            category: patternMatch.category,
            confidence: patternMatch.confidence,
            reasoning: 'Pattern matched',
          };
          this.cache.set(cleanedPayee, transaction.amount, suggestion);
          progress.patternMatched++;
          return { transaction, suggestion };
        }

        // Use LLM with fallback
        try {
          const suggestion = await categorizeWithLLM(transaction, cleanedPayee, this.llmClient);
          this.cache.set(cleanedPayee, transaction.amount, suggestion);
          progress.llmCategorized++;
          return { transaction, suggestion };
        } catch (error) {
          // Fallback to pattern match or uncategorized
          console.warn(`⚠️  LLM categorization failed for "${cleanedPayee}", using fallback`);
          
          if (patternMatch) {
            const fallbackSuggestion: CategorySuggestion = {
              category: patternMatch.category,
              confidence: 'low',
              reasoning: 'Fallback to pattern match due to LLM error',
            };
            this.cache.set(cleanedPayee, transaction.amount, fallbackSuggestion);
            progress.patternMatched++;
            return { transaction, suggestion: fallbackSuggestion };
          }
          
          // Last resort: uncategorized
          const uncategorizedSuggestion: CategorySuggestion = {
            category: 'Uncategorized',
            confidence: 'low',
            reasoning: 'LLM error and no pattern match available',
          };
          this.cache.set(cleanedPayee, transaction.amount, uncategorizedSuggestion);
          return { transaction, suggestion: uncategorizedSuggestion };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Store results
      for (const { transaction, suggestion } of batchResults) {
        results.set(transaction, suggestion);
        progress.processed++;
      }

      // Report progress
      if (onProgress) {
        onProgress({ ...progress });
      }

      // Rate limiting delay between batches (except for last batch)
      if (i + this.batchSize < transactions.length) {
        await this.sleep(this.rateLimitDelay);
      }
    }

    return results;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
