/**
 * CSV Formatter for Chase CSV Import Tool
 * 
 * Generates the final cleaned CSV file with proper formatting, quoting, and encoding.
 */

import { stringify } from 'csv-stringify/sync';
import { writeFile } from 'fs/promises';
import { format } from 'date-fns';
import { ProcessedTransaction, StartingBalanceEntry } from './types.js';
import { validateOutputFile, validateProcessedTransactions, validateTransactionAmounts, checkOutputFileOverwrite, CSVImportError, ErrorType } from './error-handler.js';

/**
 * CSV row representing a transaction in the output format
 */
interface CSVRow {
  Date: string;
  Payee: string;
  Category: string;
  Notes: string;
  Amount: number;
}

/**
 * Format processed transactions into CSV string
 * 
 * Generates a CSV with the following structure:
 * - Header row: Date,Payee,Category,Notes,Amount
 * - Starting balance as first data row
 * - All processed transactions in chronological order
 * 
 * @param startingBalance - Starting balance entry
 * @param transactions - Array of processed transactions (should be sorted chronologically)
 * @returns CSV string with proper formatting and quoting
 */
export function formatTransactionsToCSV(
  startingBalance: StartingBalanceEntry,
  transactions: ProcessedTransaction[]
): string {
  // Create array of CSV rows
  const rows: CSVRow[] = [];

  // Add starting balance as first row
  rows.push({
    Date: startingBalance.date,
    Payee: startingBalance.payee,
    Category: startingBalance.category,
    Notes: startingBalance.notes,
    Amount: startingBalance.amount,
  });

  // Add all processed transactions in chronological order
  for (const transaction of transactions) {
    rows.push({
      Date: transaction.date,
      Payee: transaction.payee,
      Category: transaction.category,
      Notes: transaction.notes,
      Amount: transaction.amount,
    });
  }

  // Use csv-stringify to generate CSV with proper quoting and escaping
  const csv = stringify(rows, {
    header: true,
    columns: ['Date', 'Payee', 'Category', 'Notes', 'Amount'],
    quoted: true, // Quote all fields to handle commas and special characters
    quoted_string: true, // Always quote string fields
    escape: '"', // Use double quotes for escaping
    record_delimiter: '\n', // Use Unix line endings
  });

  return csv;
}

/**
 * Generate output filename with descriptive naming convention
 * 
 * Format: ChaseChecking_Cleaned_YYYY-MM-DD.csv
 * 
 * @param baseFilename - Optional base filename (defaults to "ChaseChecking")
 * @returns Descriptive filename with current date
 */
export function generateOutputFilename(baseFilename: string = 'ChaseChecking'): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  return `${baseFilename}_Cleaned_${today}.csv`;
}

/**
 * Write CSV content to file with UTF-8 encoding
 * 
 * @param csvContent - CSV string content
 * @param outputPath - Path where the file should be written
 * @throws Error if file write fails
 */
export async function writeCSVToFile(csvContent: string, outputPath: string): Promise<void> {
  // Validate output file path before writing
  validateOutputFile(outputPath);
  
  // Check if we're overwriting an existing file
  checkOutputFileOverwrite(outputPath);
  
  try {
    await writeFile(outputPath, csvContent, { encoding: 'utf-8' });
  } catch (error) {
    throw new CSVImportError(
      ErrorType.FILE_WRITE_ERROR,
      `Failed to write CSV file to ${outputPath}: ${error instanceof Error ? error.message : String(error)}`,
      `Could not write the output file "${outputPath}". Please check that you have write permissions and sufficient disk space.`,
      error as Error,
      { outputPath }
    );
  }
}

/**
 * Format and write cleaned CSV file
 * 
 * This is the main entry point for CSV formatting. It combines all the steps:
 * 1. Validate processed transactions
 * 2. Format transactions into CSV string
 * 3. Write to file with proper encoding
 * 
 * @param startingBalance - Starting balance entry
 * @param transactions - Array of processed transactions
 * @param outputPath - Path where the file should be written
 * @throws Error if formatting or writing fails
 */
export async function formatAndWriteCSV(
  startingBalance: StartingBalanceEntry,
  transactions: ProcessedTransaction[],
  outputPath: string
): Promise<void> {
  // Validate processed transactions before writing
  validateProcessedTransactions(transactions, startingBalance);
  
  // Validate transaction amounts for suspicious patterns (warnings only)
  validateTransactionAmounts(transactions);

  // Format transactions to CSV string
  const csvContent = formatTransactionsToCSV(startingBalance, transactions);

  // Write to file with UTF-8 encoding
  await writeCSVToFile(csvContent, outputPath);
}
