/**
 * CSV Parser for Chase transaction files
 */

import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { parse as parseDate, isValid } from 'date-fns';
import { ChaseTransaction } from './types.js';
import { validateInputFile, handleCSVParseError } from './error-handler.js';

/**
 * Expected column headers in Chase CSV
 */
const EXPECTED_HEADERS = [
  'Details',
  'Posting Date',
  'Description',
  'Amount',
  'Type',
  'Balance',
  'Check or Slip #',
];

/**
 * Parse a Chase CSV file and return an array of transactions
 * 
 * @param filePath - Path to the Chase CSV file
 * @returns Array of parsed ChaseTransaction objects
 * @throws Error if file cannot be read or CSV structure is invalid
 */
export function parseChaseCSV(filePath: string): ChaseTransaction[] {
  // Validate input file exists and is readable
  validateInputFile(filePath);

  // Read file content
  let fileContent: string;
  try {
    fileContent = readFileSync(filePath, 'utf-8');
  } catch (error) {
    handleCSVParseError(error, filePath);
  }

  // Parse CSV
  let records: string[][];
  try {
    records = parse(fileContent, {
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true, // Allow variable column counts
    });
  } catch (error) {
    handleCSVParseError(error, filePath);
  }

  // Validate we have at least a header row
  if (records.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Validate header row
  const headers = records[0];
  validateHeaders(headers);

  // Parse transaction rows
  const transactions: ChaseTransaction[] = [];
  const errors: string[] = [];
  let skippedCount = 0;

  for (let i = 1; i < records.length; i++) {
    const row = records[i];
    
    // Skip completely empty rows
    if (row.every(cell => !cell || cell.trim() === '')) {
      continue;
    }
    
    try {
      const transaction = parseTransactionRow(row, i + 1);
      transactions.push(transaction);
    } catch (error) {
      skippedCount++;
      const errorMsg = `Row ${i + 1}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      console.warn(`⚠️  Skipping invalid row ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Log the problematic row data for debugging (first 3 columns only to avoid clutter)
      const rowPreview = row.slice(0, 3).map(cell => `"${cell}"`).join(', ');
      console.warn(`   Row data preview: ${rowPreview}...`);
    }
  }

  // Log summary of parsing results
  if (skippedCount > 0) {
    console.warn(`\n⚠️  Parsing complete: ${transactions.length} valid transactions, ${skippedCount} rows skipped`);
  }

  if (transactions.length === 0 && errors.length > 0) {
    throw new Error(`No valid transactions found. All ${errors.length} rows had errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : ''}`);
  }

  if (transactions.length === 0) {
    throw new Error('No transactions found in CSV file');
  }

  // Sort transactions chronologically (oldest first)
  transactions.sort((a, b) => {
    const dateA = parseDateString(a.postingDate);
    const dateB = parseDateString(b.postingDate);
    
    if (!dateA || !dateB) {
      return 0; // Keep original order if dates can't be parsed
    }
    
    return dateA.getTime() - dateB.getTime();
  });

  return transactions;
}

/**
 * Validate CSV headers match expected format
 */
function validateHeaders(headers: string[]): void {
  if (headers.length !== EXPECTED_HEADERS.length) {
    throw new Error(
      `Invalid CSV structure: Expected ${EXPECTED_HEADERS.length} columns, found ${headers.length}. ` +
      `Expected headers: ${EXPECTED_HEADERS.join(', ')}`
    );
  }

  for (let i = 0; i < EXPECTED_HEADERS.length; i++) {
    if (headers[i] !== EXPECTED_HEADERS[i]) {
      throw new Error(
        `Invalid CSV header at column ${i + 1}: Expected "${EXPECTED_HEADERS[i]}", found "${headers[i]}"`
      );
    }
  }
}

/**
 * Parse a single transaction row into a ChaseTransaction object
 */
function parseTransactionRow(row: string[], rowNumber: number): ChaseTransaction {
  // Validate row has minimum required columns
  if (row.length < EXPECTED_HEADERS.length) {
    const missingCount = EXPECTED_HEADERS.length - row.length;
    throw new Error(
      `Invalid row structure: Expected ${EXPECTED_HEADERS.length} columns, found ${row.length}. Missing ${missingCount} column(s).`
    );
  }

  const [details, postingDate, description, amountStr, type, balanceStr, checkOrSlip = ''] = row;

  // Validate required fields are not empty
  const missingFields: string[] = [];
  if (!details?.trim()) missingFields.push('Details');
  if (!postingDate?.trim()) missingFields.push('Posting Date');
  if (!description?.trim()) missingFields.push('Description');
  if (!amountStr?.trim()) missingFields.push('Amount');
  if (!type?.trim()) missingFields.push('Type');
  if (!balanceStr?.trim()) missingFields.push('Balance');

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Parse and validate amount
  const amount = parseFloat(amountStr.trim());
  if (isNaN(amount)) {
    throw new Error(`Invalid amount value: "${amountStr}". Amount must be a valid number.`);
  }
  if (!isFinite(amount)) {
    throw new Error(`Invalid amount value: "${amountStr}". Amount must be a finite number.`);
  }

  // Parse and validate balance
  const balance = parseFloat(balanceStr.trim());
  if (isNaN(balance)) {
    throw new Error(`Invalid balance value: "${balanceStr}". Balance must be a valid number.`);
  }
  if (!isFinite(balance)) {
    throw new Error(`Invalid balance value: "${balanceStr}". Balance must be a finite number.`);
  }

  // Validate date format
  const trimmedDate = postingDate.trim();
  const parsedDate = parseDateString(trimmedDate);
  if (!parsedDate) {
    throw new Error(`Invalid date format: "${trimmedDate}". Expected MM/DD/YYYY format.`);
  }

  return {
    details: details.trim(),
    postingDate: trimmedDate,
    description: description.trim(),
    amount,
    type: type.trim(),
    balance,
    checkOrSlip: checkOrSlip?.trim() || '',
  };
}

/**
 * Parse a date string in MM/DD/YYYY format
 * 
 * @param dateStr - Date string to parse
 * @returns Date object if valid, null otherwise
 */
function parseDateString(dateStr: string): Date | null {
  try {
    const parsed = parseDate(dateStr, 'MM/dd/yyyy', new Date());
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
