/**
 * Comprehensive error handling for CSV Import Tool
 *
 * Provides centralized error handling, validation, and user-friendly error messages
 */

import { existsSync, accessSync, constants } from 'fs';
import { dirname } from 'path';
import { ProcessedTransaction, StartingBalanceEntry } from './types.js';

/**
 * Error types for better error categorization
 */
export enum ErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  CSV_PARSE_ERROR = 'CSV_PARSE_ERROR',
  CSV_VALIDATION_ERROR = 'CSV_VALIDATION_ERROR',
  LLM_API_ERROR = 'LLM_API_ERROR',
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_AUTH_ERROR = 'LLM_AUTH_ERROR',
  LLM_RATE_LIMIT = 'LLM_RATE_LIMIT',
  DATA_VALIDATION_ERROR = 'DATA_VALIDATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class with error type and user-friendly messages
 */
export class CSVImportError extends Error {
  public readonly type: ErrorType;

  public readonly userMessage: string;

  public readonly originalError?: Error;

  public readonly context?: Record<string, unknown>;

  constructor(
    type: ErrorType,
    message: string,
    userMessage: string,
    originalError?: Error,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CSVImportError';
    this.type = type;
    this.userMessage = userMessage;
    this.originalError = originalError;
    this.context = context;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CSVImportError);
    }
  }
}

/**
 * Validate input file exists and is readable
 */
export function validateInputFile(filePath: string): void {
  // Check if file exists
  if (!existsSync(filePath)) {
    throw new CSVImportError(
      ErrorType.FILE_NOT_FOUND,
      `Input file not found: ${filePath}`,
      `The input file "${filePath}" does not exist. Please check the file path and try again.`,
      undefined,
      { filePath },
    );
  }

  // Check if file is readable
  try {
    accessSync(filePath, constants.R_OK);
  } catch (error) {
    throw new CSVImportError(
      ErrorType.FILE_ACCESS_DENIED,
      `Cannot read input file: ${filePath}`,
      `Permission denied: Cannot read the file "${filePath}". Please check file permissions.`,
      error as Error,
      { filePath },
    );
  }
}

/**
 * Validate output file path is writable
 */
export function validateOutputFile(filePath: string): void {
  const dir = dirname(filePath);

  // Check if directory exists
  if (!existsSync(dir)) {
    throw new CSVImportError(
      ErrorType.FILE_WRITE_ERROR,
      `Output directory does not exist: ${dir}`,
      `The output directory "${dir}" does not exist. Please create it or specify a different output path.`,
      undefined,
      { filePath, directory: dir },
    );
  }

  // Check if directory is writable
  try {
    accessSync(dir, constants.W_OK);
  } catch (error) {
    throw new CSVImportError(
      ErrorType.FILE_ACCESS_DENIED,
      `Cannot write to output directory: ${dir}`,
      `Permission denied: Cannot write to directory "${dir}". Please check directory permissions.`,
      error as Error,
      { filePath, directory: dir },
    );
  }

  // If file exists, check if it's writable
  if (existsSync(filePath)) {
    try {
      accessSync(filePath, constants.W_OK);
    } catch (error) {
      throw new CSVImportError(
        ErrorType.FILE_ACCESS_DENIED,
        `Cannot overwrite output file: ${filePath}`,
        `Permission denied: Cannot overwrite the file "${filePath}". Please check file permissions or specify a different output path.`,
        error as Error,
        { filePath },
      );
    }
  }
}

/**
 * Wrap CSV parsing errors with user-friendly messages
 */
export function handleCSVParseError(error: unknown, filePath: string): never {
  const originalError = error as Error;

  throw new CSVImportError(
    ErrorType.CSV_PARSE_ERROR,
    `Failed to parse CSV file: ${originalError.message}`,
    `The CSV file "${filePath}" could not be parsed. Please ensure it's a valid Chase CSV export file.`,
    originalError,
    { filePath },
  );
}

/**
 * Handle LLM API errors with appropriate fallback strategies
 */
export function handleLLMError(error: unknown, context?: Record<string, unknown>): CSVImportError {
  const originalError = error as Error;
  const errorMessage = originalError.message.toLowerCase();

  // Authentication errors
  if (
    errorMessage.includes('401') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('api key')
  ) {
    return new CSVImportError(
      ErrorType.LLM_AUTH_ERROR,
      `LLM API authentication failed: ${originalError.message}`,
      'Invalid or missing API key. Please check your LLM_API_KEY environment variable or --api-key option.',
      originalError,
      context,
    );
  }

  // Rate limiting errors
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return new CSVImportError(
      ErrorType.LLM_RATE_LIMIT,
      `LLM API rate limit exceeded: ${originalError.message}`,
      'API rate limit exceeded. Try reducing the batch size with --batch-size or increasing the delay with --delay.',
      originalError,
      context,
    );
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return new CSVImportError(
      ErrorType.LLM_TIMEOUT,
      `LLM API request timed out: ${originalError.message}`,
      'API request timed out. This may be due to network issues or high API load. The tool will retry automatically.',
      originalError,
      context,
    );
  }

  // Generic API error
  return new CSVImportError(
    ErrorType.LLM_API_ERROR,
    `LLM API error: ${originalError.message}`,
    'An error occurred while communicating with the LLM API. The tool will use fallback categorization for affected transactions.',
    originalError,
    context,
  );
}

/**
 * Validate processed transactions before writing to CSV
 */
export function validateProcessedTransactions(
  transactions: ProcessedTransaction[],
  startingBalance: StartingBalanceEntry,
): void {
  const errors: string[] = [];

  // Validate starting balance
  if (!startingBalance.date || !startingBalance.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.push(`Invalid starting balance date: ${startingBalance.date}`);
  }

  if (!isFinite(startingBalance.amount)) {
    errors.push(`Invalid starting balance amount: ${startingBalance.amount}`);
  }

  // Validate each transaction
  transactions.forEach((transaction, index) => {
    const txNum = index + 1;

    // Validate date format (YYYY-MM-DD)
    if (!transaction.date || !transaction.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push(
        `Transaction ${txNum}: Invalid date format "${transaction.date}". Expected YYYY-MM-DD.`,
      );
    }

    // Validate payee is not empty
    if (!transaction.payee || transaction.payee.trim() === '') {
      errors.push(`Transaction ${txNum}: Payee is empty or missing.`);
    }

    // Validate category is not empty
    if (!transaction.category || transaction.category.trim() === '') {
      errors.push(`Transaction ${txNum}: Category is empty or missing.`);
    }

    // Validate amount is a valid number
    if (!isFinite(transaction.amount)) {
      errors.push(
        `Transaction ${txNum}: Invalid amount "${transaction.amount}". Must be a finite number.`,
      );
    }

    // Warn on suspicious amounts (but don't fail)
    if (Math.abs(transaction.amount) > 1000000) {
      console.warn(`⚠️  Transaction ${txNum}: Unusually large amount: ${transaction.amount}`);
    }
  });

  // Throw error if any validation failed
  if (errors.length > 0) {
    throw new CSVImportError(
      ErrorType.DATA_VALIDATION_ERROR,
      `Data validation failed: ${errors.length} error(s) found`,
      `Output validation failed. ${errors.length} transaction(s) have invalid data:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : ''}`,
      undefined,
      { errorCount: errors.length, errors },
    );
  }
}

/**
 * Validate transaction amounts for suspicious patterns
 */
export function validateTransactionAmounts(transactions: ProcessedTransaction[]): void {
  const warnings: string[] = [];

  transactions.forEach((transaction, index) => {
    const txNum = index + 1;

    // Check for zero amounts
    if (transaction.amount === 0) {
      warnings.push(
        `Transaction ${txNum} (${transaction.date} - ${transaction.payee}): Amount is zero`,
      );
    }

    // Check for extremely large amounts
    if (Math.abs(transaction.amount) > 100000) {
      warnings.push(
        `Transaction ${txNum} (${transaction.date} - ${transaction.payee}): Very large amount: ${transaction.amount}`,
      );
    }
  });

  // Log warnings if any found
  if (warnings.length > 0) {
    console.warn(`\n⚠️  Data validation warnings (${warnings.length}):`);
    warnings.slice(0, 10).forEach((warning) => {
      console.warn(`   ${warning}`);
    });
    if (warnings.length > 10) {
      console.warn(`   ... and ${warnings.length - 10} more warnings`);
    }
  }
}

/**
 * Check if output would overwrite existing file and warn user
 */
export function checkOutputFileOverwrite(filePath: string): void {
  if (existsSync(filePath)) {
    console.warn(
      `\n⚠️  Warning: Output file "${filePath}" already exists and will be overwritten.`,
    );
  }
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: unknown): string {
  if (error instanceof CSVImportError) {
    let message = `❌ ${error.userMessage}`;

    if (error.context) {
      const contextStr = Object.entries(error.context)
        .map(([key, value]) => `  ${key}: ${value}`)
        .join('\n');
      if (contextStr) {
        message += `\n\nDetails:\n${contextStr}`;
      }
    }

    return message;
  }

  if (error instanceof Error) {
    return `❌ An unexpected error occurred: ${error.message}`;
  }

  return `❌ An unknown error occurred: ${String(error)}`;
}

/**
 * Validate configuration before processing
 */
export function validateConfiguration(config: {
  inputFile: string;
  outputFile: string;
  llmApiKey: string;
  batchSize: number;
  rateLimitDelay: number;
}): void {
  const errors: string[] = [];

  // Validate input file
  if (!config.inputFile) {
    errors.push('Input file path is required');
  }

  // Validate output file
  if (!config.outputFile) {
    errors.push('Output file path is required');
  }

  // Validate API key
  if (!config.llmApiKey || config.llmApiKey.trim() === '') {
    errors.push(
      'LLM API key is required. Set LLM_API_KEY environment variable or use --api-key option',
    );
  }

  // Validate batch size
  if (config.batchSize < 1 || config.batchSize > 100) {
    errors.push('Batch size must be between 1 and 100');
  }

  // Validate rate limit delay
  if (config.rateLimitDelay < 0 || config.rateLimitDelay > 60000) {
    errors.push('Rate limit delay must be between 0 and 60000 milliseconds');
  }

  if (errors.length > 0) {
    throw new CSVImportError(
      ErrorType.CONFIGURATION_ERROR,
      `Configuration validation failed: ${errors.join(', ')}`,
      `Invalid configuration:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
      undefined,
      { errors },
    );
  }
}
