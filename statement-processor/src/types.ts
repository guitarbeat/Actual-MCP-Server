/**
 * Type definitions for Chase CSV Import Tool
 */

/**
 * Raw transaction from Chase CSV export
 */
export interface ChaseTransaction {
  details: string; // DEBIT, CREDIT, DSLIP
  postingDate: string; // MM/DD/YYYY
  description: string; // Full transaction description
  amount: number; // Positive for credits, negative for debits
  type: string; // ACH_DEBIT, MISC_CREDIT, etc.
  balance: number; // Account balance after transaction
  checkOrSlip: string; // Check/slip number if applicable
}

/**
 * Cleaned payee information extracted from transaction description
 */
export interface CleanedPayee {
  payee: string; // Cleaned payee name
  notes: string; // Additional details (IDs, reference numbers)
}

/**
 * LLM category suggestion with confidence level
 */
export interface CategorySuggestion {
  category: string; // Suggested budget category
  confidence: 'high' | 'medium' | 'low';
  reasoning?: string; // Optional explanation
}

/**
 * Processed transaction ready for CSV output
 */
export interface ProcessedTransaction {
  date: string; // YYYY-MM-DD format
  payee: string; // Cleaned payee name
  category: string; // LLM-suggested category
  notes: string; // Original description + reference IDs
  amount: number; // Transaction amount
}

/**
 * Starting balance entry for account reconciliation
 */
export interface StartingBalanceEntry {
  date: string;
  payee: string;
  category: string;
  notes: string;
  amount: number;
}

/**
 * Configuration for CSV import tool
 */
export interface CSVImportConfig {
  inputFile: string;
  outputFile: string;
  llmModel: string;
  llmApiKey: string;
  batchSize: number;
  rateLimitDelay: number; // milliseconds between batches
  enableCaching: boolean;
  startDate?: string; // Optional: filter transactions from this date (YYYY-MM-DD)
  startingBalance?: number; // Optional: custom starting balance
}
