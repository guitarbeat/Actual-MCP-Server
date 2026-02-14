/**
 * Main processing orchestrator for Chase CSV Import Tool
 *
 * Coordinates the end-to-end flow:
 * 1. Parse Chase CSV
 * 2. Calculate starting balance
 * 3. Process all transactions (clean payees, categorize)
 * 4. Format and write cleaned CSV
 */

import { CSVImportConfig } from './types.js';
import { parseChaseCSV } from './parse-csv.js';
import { calculateStartingBalance } from './calculate-balance.js';
import { processAllTransactions } from './process-transactions.js';
import { formatAndWriteCSV } from './format-output-csv.js';
import { CategorizationEngine } from './categorize-transactions.js';
import { LLMClient } from './llm-client.js';
import { validateConfiguration, CSVImportError, formatErrorForUser } from './handle-errors.js';
import {
  validateChaseTransactions,
  validateProcessedTransactions,
  validateStartingBalance,
  validateBalanceConsistency,
  displayValidationSummary,
} from './data-validator.js';

/**
 * Result of the CSV processing operation
 */
export interface ProcessingResult {
  success: boolean;
  inputFile: string;
  outputFile: string;
  transactionsProcessed: number;
  transactionsFailed: number;
  startingBalance: number;
  errors: string[];
}

/**
 * Progress callback for processing updates
 */
export type ProgressCallback = (stage: string, current: number, total: number) => void;

/**
 * Main processing function that orchestrates the entire CSV transformation
 *
 * @param config - Configuration for the CSV import process
 * @param onProgress - Optional callback for progress updates
 * @returns Processing result with statistics
 */
export async function processChaseCSV(
  config: CSVImportConfig,
  onProgress?: ProgressCallback,
): Promise<ProcessingResult> {
  const errors: string[] = [];

  try {
    // Validate configuration before processing
    validateConfiguration({
      inputFile: config.inputFile,
      outputFile: config.outputFile,
      llmApiKey: config.llmApiKey,
      batchSize: config.batchSize,
      rateLimitDelay: config.rateLimitDelay,
    });

    // Step 1: Parse Chase CSV
    if (onProgress) onProgress('Parsing CSV', 0, 6);
    console.log(`\n📄 Reading Chase CSV from: ${config.inputFile}`);

    let transactions = parseChaseCSV(config.inputFile);
    console.log(`✓ Parsed ${transactions.length} transactions`);

    if (transactions.length === 0) {
      throw new Error('No transactions found in CSV file');
    }

    // Filter transactions by start date if specified
    if (config.startDate) {
      const startDate = new Date(config.startDate);
      const originalCount = transactions.length;
      transactions = transactions.filter((t) => {
        // Parse MM/DD/YYYY format
        const [month, day, year] = t.postingDate.split('/');
        const txDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return txDate >= startDate;
      });
      console.log(
        `✓ Filtered to ${transactions.length} transactions from ${config.startDate} onwards (${originalCount - transactions.length} excluded)`,
      );

      if (transactions.length === 0) {
        throw new Error(`No transactions found on or after ${config.startDate}`);
      }
    }

    // Step 2: Validate raw transactions
    if (onProgress) onProgress('Validating data', 1, 6);
    console.log(`\n🔍 Validating transaction data...`);
    const rawValidation = validateChaseTransactions(transactions);
    displayValidationSummary(rawValidation, 'Raw Transactions');

    // Check for balance consistency
    const balanceValidation = validateBalanceConsistency(transactions);
    if (balanceValidation.warnings.length > 0) {
      console.log(`\n⚠️  Balance Consistency Warnings:`);
      balanceValidation.warnings.slice(0, 5).forEach((warning) => {
        console.log(`   - ${warning}`);
      });
      if (balanceValidation.warnings.length > 5) {
        console.log(`   ... and ${balanceValidation.warnings.length - 5} more warnings`);
      }
    }

    // Fail if there are invalid transactions
    if (rawValidation.invalidTransactions > 0) {
      throw new Error(
        `Data validation failed: ${rawValidation.invalidTransactions} invalid transaction(s) found. ` +
          `Please review the errors above and fix the input CSV file.`,
      );
    }

    // Step 3: Calculate or use custom starting balance
    if (onProgress) onProgress('Calculating starting balance', 2, 6);
    console.log(`\n💰 Calculating starting balance...`);

    let startingBalance;
    if (config.startingBalance !== undefined && config.startDate) {
      // Use custom starting balance
      const startDate = new Date(config.startDate);
      startDate.setDate(startDate.getDate() - 1); // One day before start date
      const formattedDate = startDate.toISOString().split('T')[0];

      startingBalance = {
        date: formattedDate,
        payee: 'Starting Balance',
        category: 'Transfer: Internal',
        notes: 'Custom opening balance for account',
        amount: config.startingBalance,
      };
      console.log(
        `✓ Using custom starting balance: ${startingBalance.amount.toFixed(2)} on ${startingBalance.date}`,
      );
    } else {
      // Calculate starting balance automatically
      startingBalance = calculateStartingBalance(transactions);
      console.log(
        `✓ Starting balance: ${startingBalance.amount.toFixed(2)} on ${startingBalance.date}`,
      );
    }

    // Validate starting balance
    const startingBalanceValidation = validateStartingBalance(startingBalance);
    if (startingBalanceValidation.warnings.length > 0) {
      console.log(`\n⚠️  Starting Balance Warnings:`);
      startingBalanceValidation.warnings.forEach((warning) => {
        console.log(`   - ${warning}`);
      });
    }
    if (!startingBalanceValidation.isValid) {
      throw new Error(
        `Starting balance validation failed: ${startingBalanceValidation.errors.join(', ')}`,
      );
    }

    // Step 4: Initialize LLM client and categorization engine
    if (onProgress) onProgress('Initializing categorization engine', 3, 6);
    console.log(`\n🤖 Initializing LLM categorization engine...`);
    console.log(`   Model: ${config.llmModel}`);
    console.log(`   Batch size: ${config.batchSize}`);
    console.log(`   Caching: ${config.enableCaching ? 'enabled' : 'disabled'}`);

    const llmClient = new LLMClient({
      apiKey: config.llmApiKey,
      model: config.llmModel,
      maxRetries: 3,
      timeout: 30000,
    });

    const categorizationEngine = new CategorizationEngine({
      llmClient,
      enableCaching: config.enableCaching,
      batchSize: config.batchSize,
      rateLimitDelay: config.rateLimitDelay,
    });

    // Step 5: Process all transactions
    if (onProgress) onProgress('Processing transactions', 4, 6);
    console.log(`\n⚙️  Processing ${transactions.length} transactions...`);

    const { processed, stats } = await processAllTransactions(
      transactions,
      categorizationEngine,
      (current, total) => {
        if (onProgress) {
          onProgress('Processing transactions', current, total);
        }
      },
    );

    console.log(`✓ Processed ${stats.successful} transactions successfully`);
    if (stats.failed > 0) {
      console.log(`⚠️  ${stats.failed} transactions failed to process`);
      errors.push(...stats.errors.map((e) => e.error));
    }

    // Validate processed transactions
    console.log(`\n🔍 Validating processed transactions...`);
    const processedValidation = validateProcessedTransactions(processed);
    if (processedValidation.warnings.length > 0) {
      console.log(`\n⚠️  Processed Transaction Warnings:`);
      processedValidation.warnings.slice(0, 10).forEach(({ warnings }) => {
        warnings.forEach((warning) => {
          console.log(`   - ${warning}`);
        });
      });
      if (processedValidation.warnings.length > 10) {
        const remainingWarnings = processedValidation.warnings
          .slice(10)
          .reduce((sum, w) => sum + w.warnings.length, 0);
        console.log(`   ... and ${remainingWarnings} more warnings`);
      }
    }
    if (processedValidation.invalidTransactions > 0) {
      throw new Error(
        `Processed transaction validation failed: ${processedValidation.invalidTransactions} invalid transaction(s) found.`,
      );
    }

    // Display cache statistics
    const cacheStats = categorizationEngine.getCacheStats();
    console.log(`\n📊 Categorization statistics:`);
    console.log(`   Cache enabled: ${cacheStats.enabled ? 'yes' : 'no'}`);
    console.log(`   Cache size: ${cacheStats.size} entries`);

    // Step 6: Format and write cleaned CSV
    if (onProgress) onProgress('Writing output CSV', 5, 6);
    console.log(`\n📝 Writing cleaned CSV to: ${config.outputFile}`);

    await formatAndWriteCSV(startingBalance, processed, config.outputFile);
    console.log(`✓ CSV file written successfully`);

    return {
      success: true,
      inputFile: config.inputFile,
      outputFile: config.outputFile,
      transactionsProcessed: stats.successful,
      transactionsFailed: stats.failed,
      startingBalance: startingBalance.amount,
      errors,
    };
  } catch (error) {
    // Handle errors with user-friendly messages
    let errorMessage: string;

    if (error instanceof CSVImportError) {
      errorMessage = error.userMessage;
      console.error(`\n${formatErrorForUser(error)}`);

      // Log technical details for debugging
      if (error.originalError) {
        console.error(`\nTechnical details: ${error.originalError.message}`);
      }
    } else {
      errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Unexpected error: ${errorMessage}`);
    }

    errors.push(errorMessage);

    return {
      success: false,
      inputFile: config.inputFile,
      outputFile: config.outputFile,
      transactionsProcessed: 0,
      transactionsFailed: 0,
      startingBalance: 0,
      errors,
    };
  }
}
