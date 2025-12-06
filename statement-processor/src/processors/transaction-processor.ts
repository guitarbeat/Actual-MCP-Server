/**
 * Transaction Processor - Orchestrates the transformation of Chase transactions
 */

import { ChaseTransaction, ProcessedTransaction } from './types.js';
import { cleanPayeeName } from './payee-cleaner.js';
import { CategorizationEngine } from './categorization-engine.js';

/**
 * Convert date from MM/DD/YYYY to YYYY-MM-DD format
 * 
 * @param dateStr - Date string in MM/DD/YYYY format
 * @returns Date string in YYYY-MM-DD format
 */
export function convertDateFormat(dateStr: string): string {
  // Parse MM/DD/YYYY format
  const parts = dateStr.split('/');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}. Expected MM/DD/YYYY`);
  }

  const [month, day, year] = parts;
  
  // Validate parts
  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);
  const yearNum = parseInt(year, 10);

  if (isNaN(monthNum) || isNaN(dayNum) || isNaN(yearNum)) {
    throw new Error(`Invalid date format: ${dateStr}. Expected numeric values`);
  }

  if (monthNum < 1 || monthNum > 12) {
    throw new Error(`Invalid month: ${month}. Must be between 1 and 12`);
  }

  if (dayNum < 1 || dayNum > 31) {
    throw new Error(`Invalid day: ${day}. Must be between 1 and 31`);
  }

  // Pad with zeros if needed
  const paddedMonth = month.padStart(2, '0');
  const paddedDay = day.padStart(2, '0');

  return `${year}-${paddedMonth}-${paddedDay}`;
}

/**
 * Process a single transaction through the complete pipeline
 * 
 * @param transaction - Raw Chase transaction
 * @param categorizationEngine - Engine for categorizing transactions
 * @returns Processed transaction ready for CSV output
 */
export async function processTransaction(
  transaction: ChaseTransaction,
  categorizationEngine: CategorizationEngine
): Promise<ProcessedTransaction> {
  // Convert date format from MM/DD/YYYY to YYYY-MM-DD
  const date = convertDateFormat(transaction.postingDate);

  // Call Payee Cleaner to extract payee and notes
  const cleanedPayee = cleanPayeeName(transaction.description, transaction.type);

  // Call LLM Categorization Engine for category
  const categorySuggestion = await categorizationEngine.categorizeTransaction(
    transaction,
    cleanedPayee.payee
  );

  // Combine original description with notes
  // The cleanedPayee.notes already includes the original description
  const notes = cleanedPayee.notes;

  return {
    date,
    payee: cleanedPayee.payee,
    category: categorySuggestion.category,
    notes,
    amount: transaction.amount,
  };
}

/**
 * Result of processing a single transaction (success or error)
 */
export interface TransactionProcessingResult {
  success: boolean;
  transaction?: ProcessedTransaction;
  error?: string;
  originalTransaction: ChaseTransaction;
}

/**
 * Statistics for the processing operation
 */
export interface ProcessingStats {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ transaction: ChaseTransaction; error: string }>;
}

/**
 * Process all transactions sequentially with error handling
 * 
 * @param transactions - Array of raw Chase transactions
 * @param categorizationEngine - Engine for categorizing transactions
 * @param onProgress - Optional callback for progress updates
 * @returns Array of processed transactions and processing statistics
 */
export async function processAllTransactions(
  transactions: ChaseTransaction[],
  categorizationEngine: CategorizationEngine,
  onProgress?: (current: number, total: number) => void
): Promise<{ processed: ProcessedTransaction[]; stats: ProcessingStats }> {
  const processed: ProcessedTransaction[] = [];
  const stats: ProcessingStats = {
    total: transactions.length,
    successful: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];

    try {
      const processedTransaction = await processTransaction(transaction, categorizationEngine);
      processed.push(processedTransaction);
      stats.successful++;
    } catch (error) {
      // Log warning but continue processing
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(
        `⚠️  Failed to process transaction ${i + 1}/${transactions.length}: ${errorMessage}`
      );
      console.warn(`   Transaction details: ${transaction.postingDate} - ${transaction.description}`);

      stats.failed++;
      stats.errors.push({
        transaction,
        error: errorMessage,
      });
    }

    // Report progress
    if (onProgress) {
      onProgress(i + 1, transactions.length);
    }
  }

  // Log summary
  if (stats.failed > 0) {
    console.warn(
      `\n⚠️  Processing complete: ${stats.successful} successful, ${stats.failed} failed`
    );
  }

  return { processed, stats };
}
