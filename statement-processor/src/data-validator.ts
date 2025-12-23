/**
 * Data Validator - Comprehensive validation for transaction data
 * 
 * Validates transaction amounts, required fields, and warns on suspicious data
 */

import { ChaseTransaction, ProcessedTransaction, StartingBalanceEntry } from './types.js';

/**
 * Validation result for a single transaction
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validation summary for all transactions
 */
export interface ValidationSummary {
  totalTransactions: number;
  validTransactions: number;
  invalidTransactions: number;
  totalWarnings: number;
  errors: Array<{ index: number; transaction: ChaseTransaction; errors: string[] }>;
  warnings: Array<{ index: number; transaction: ChaseTransaction | ProcessedTransaction; warnings: string[] }>;
}

/**
 * Validate a raw Chase transaction
 * 
 * @param transaction - Raw Chase transaction to validate
 * @param index - Transaction index for error reporting
 * @returns Validation result with errors and warnings
 */
export function validateChaseTransaction(
  transaction: ChaseTransaction,
  index: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields are not empty
  if (!transaction.details || transaction.details.trim() === '') {
    errors.push(`Transaction ${index + 1}: Details field is empty`);
  }

  if (!transaction.postingDate || transaction.postingDate.trim() === '') {
    errors.push(`Transaction ${index + 1}: Posting date is empty`);
  }

  if (!transaction.description || transaction.description.trim() === '') {
    errors.push(`Transaction ${index + 1}: Description is empty`);
  }

  if (!transaction.type || transaction.type.trim() === '') {
    errors.push(`Transaction ${index + 1}: Type field is empty`);
  }

  // Validate amount
  if (!isFinite(transaction.amount)) {
    errors.push(`Transaction ${index + 1}: Amount is not a valid number (${transaction.amount})`);
  } else {
    // Warn on zero amounts
    if (transaction.amount === 0) {
      warnings.push(`Transaction ${index + 1} (${transaction.postingDate} - ${transaction.description}): Amount is zero`);
    }

    // Warn on extremely large amounts (> $100,000)
    if (Math.abs(transaction.amount) > 100000) {
      warnings.push(`Transaction ${index + 1} (${transaction.postingDate} - ${transaction.description}): Very large amount: $${transaction.amount.toFixed(2)}`);
    }

    // Warn on very small amounts (< $0.01)
    if (Math.abs(transaction.amount) > 0 && Math.abs(transaction.amount) < 0.01) {
      warnings.push(`Transaction ${index + 1} (${transaction.postingDate} - ${transaction.description}): Very small amount: $${transaction.amount.toFixed(2)}`);
    }
  }

  // Validate balance
  if (!isFinite(transaction.balance)) {
    errors.push(`Transaction ${index + 1}: Balance is not a valid number (${transaction.balance})`);
  } else {
    // Warn on negative balances
    if (transaction.balance < 0) {
      warnings.push(`Transaction ${index + 1} (${transaction.postingDate}): Negative balance: $${transaction.balance.toFixed(2)}`);
    }

    // Warn on extremely large balances (> $1,000,000)
    if (transaction.balance > 1000000) {
      warnings.push(`Transaction ${index + 1} (${transaction.postingDate}): Very large balance: $${transaction.balance.toFixed(2)}`);
    }
  }

  // Validate date format (MM/DD/YYYY)
  if (transaction.postingDate && !transaction.postingDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    errors.push(`Transaction ${index + 1}: Invalid date format "${transaction.postingDate}". Expected MM/DD/YYYY`);
  }

  // Validate details field contains expected values
  const validDetails = ['DEBIT', 'CREDIT', 'DSLIP', 'CHECK'];
  if (transaction.details && !validDetails.includes(transaction.details.toUpperCase())) {
    warnings.push(`Transaction ${index + 1}: Unexpected details value "${transaction.details}". Expected one of: ${validDetails.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all raw Chase transactions
 * 
 * @param transactions - Array of raw Chase transactions
 * @returns Validation summary with all errors and warnings
 */
export function validateChaseTransactions(
  transactions: ChaseTransaction[]
): ValidationSummary {
  const summary: ValidationSummary = {
    totalTransactions: transactions.length,
    validTransactions: 0,
    invalidTransactions: 0,
    totalWarnings: 0,
    errors: [],
    warnings: [],
  };

  transactions.forEach((transaction, index) => {
    const result = validateChaseTransaction(transaction, index);

    if (result.isValid) {
      summary.validTransactions++;
    } else {
      summary.invalidTransactions++;
      summary.errors.push({
        index,
        transaction,
        errors: result.errors,
      });
    }

    if (result.warnings.length > 0) {
      summary.totalWarnings += result.warnings.length;
      summary.warnings.push({
        index,
        transaction,
        warnings: result.warnings,
      });
    }
  });

  return summary;
}

/**
 * Validate a processed transaction
 * 
 * @param transaction - Processed transaction to validate
 * @param index - Transaction index for error reporting
 * @returns Validation result with errors and warnings
 */
export function validateProcessedTransaction(
  transaction: ProcessedTransaction,
  index: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  if (!transaction.date || transaction.date.trim() === '') {
    errors.push(`Transaction ${index + 1}: Date is empty`);
  } else if (!transaction.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.push(`Transaction ${index + 1}: Invalid date format "${transaction.date}". Expected YYYY-MM-DD`);
  }

  if (!transaction.payee || transaction.payee.trim() === '') {
    errors.push(`Transaction ${index + 1}: Payee is empty`);
  }

  if (!transaction.category || transaction.category.trim() === '') {
    errors.push(`Transaction ${index + 1}: Category is empty`);
  }

  // Validate amount
  if (!isFinite(transaction.amount)) {
    errors.push(`Transaction ${index + 1}: Amount is not a valid number (${transaction.amount})`);
  } else {
    // Warn on zero amounts
    if (transaction.amount === 0) {
      warnings.push(`Transaction ${index + 1} (${transaction.date} - ${transaction.payee}): Amount is zero`);
    }

    // Warn on extremely large amounts
    if (Math.abs(transaction.amount) > 100000) {
      warnings.push(`Transaction ${index + 1} (${transaction.date} - ${transaction.payee}): Very large amount: $${transaction.amount.toFixed(2)}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all processed transactions
 * 
 * @param transactions - Array of processed transactions
 * @returns Validation summary with all errors and warnings
 */
export function validateProcessedTransactions(
  transactions: ProcessedTransaction[]
): ValidationSummary {
  const summary: ValidationSummary = {
    totalTransactions: transactions.length,
    validTransactions: 0,
    invalidTransactions: 0,
    totalWarnings: 0,
    errors: [],
    warnings: [],
  };

  transactions.forEach((transaction, index) => {
    const result = validateProcessedTransaction(transaction, index);

    if (result.isValid) {
      summary.validTransactions++;
    } else {
      summary.invalidTransactions++;
      summary.errors.push({
        index,
        transaction: transaction as any,
        errors: result.errors,
      });
    }

    if (result.warnings.length > 0) {
      summary.totalWarnings += result.warnings.length;
      summary.warnings.push({
        index,
        transaction,
        warnings: result.warnings,
      });
    }
  });

  return summary;
}

/**
 * Validate starting balance entry
 * 
 * @param startingBalance - Starting balance entry to validate
 * @returns Validation result with errors and warnings
 */
export function validateStartingBalance(
  startingBalance: StartingBalanceEntry
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate date format
  if (!startingBalance.date || !startingBalance.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.push(`Starting balance: Invalid date format "${startingBalance.date}". Expected YYYY-MM-DD`);
  }

  // Validate payee
  if (!startingBalance.payee || startingBalance.payee.trim() === '') {
    errors.push('Starting balance: Payee is empty');
  }

  // Validate category
  if (!startingBalance.category || startingBalance.category.trim() === '') {
    errors.push('Starting balance: Category is empty');
  }

  // Validate amount
  if (!isFinite(startingBalance.amount)) {
    errors.push(`Starting balance: Amount is not a valid number (${startingBalance.amount})`);
  } else {
    // Warn on negative starting balance
    if (startingBalance.amount < 0) {
      warnings.push(`Starting balance is negative: $${startingBalance.amount.toFixed(2)}`);
    }

    // Warn on zero starting balance
    if (startingBalance.amount === 0) {
      warnings.push('Starting balance is zero');
    }

    // Warn on very large starting balance
    if (startingBalance.amount > 1000000) {
      warnings.push(`Starting balance is very large: $${startingBalance.amount.toFixed(2)}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Display validation summary to console
 * 
 * @param summary - Validation summary to display
 * @param label - Label for the validation (e.g., "Raw Transactions", "Processed Transactions")
 */
export function displayValidationSummary(summary: ValidationSummary, label: string): void {
  console.log(`\n📋 ${label} Validation:`);
  console.log(`   Total: ${summary.totalTransactions}`);
  console.log(`   Valid: ${summary.validTransactions}`);
  
  if (summary.invalidTransactions > 0) {
    console.log(`   Invalid: ${summary.invalidTransactions}`);
  }
  
  if (summary.totalWarnings > 0) {
    console.log(`   Warnings: ${summary.totalWarnings}`);
  }

  // Display errors (limit to first 5)
  if (summary.errors.length > 0) {
    console.log(`\n❌ Validation Errors:`);
    summary.errors.slice(0, 5).forEach(({ index, errors }) => {
      console.log(`   Transaction ${index + 1}:`);
      errors.forEach(error => {
        console.log(`     - ${error}`);
      });
    });
    if (summary.errors.length > 5) {
      console.log(`   ... and ${summary.errors.length - 5} more errors`);
    }
  }

  // Display warnings (limit to first 10)
  if (summary.warnings.length > 0) {
    console.log(`\n⚠️  Validation Warnings:`);
    const warningsToShow = summary.warnings.slice(0, 10);
    warningsToShow.forEach(({ warnings }) => {
      warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    });
    if (summary.warnings.length > 10) {
      const remainingWarnings = summary.warnings.slice(10).reduce((sum, w) => sum + w.warnings.length, 0);
      console.log(`   ... and ${remainingWarnings} more warnings`);
    }
  }
}

/**
 * Check for balance consistency across transactions
 * 
 * @param transactions - Array of raw Chase transactions (must be sorted chronologically)
 * @returns Validation result with errors and warnings
 */
export function validateBalanceConsistency(
  transactions: ChaseTransaction[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (transactions.length === 0) {
    return { isValid: true, errors, warnings };
  }

  // Check if balances are consistent with amounts
  for (let i = 1; i < transactions.length; i++) {
    const prevTransaction = transactions[i - 1];
    const currentTransaction = transactions[i];

    // Calculate expected balance
    const expectedBalance = prevTransaction.balance + currentTransaction.amount;
    const actualBalance = currentTransaction.balance;

    // Allow for small floating-point differences (< $0.01)
    const difference = Math.abs(expectedBalance - actualBalance);
    
    if (difference > 0.01) {
      warnings.push(
        `Balance inconsistency at transaction ${i + 1} (${currentTransaction.postingDate}): ` +
        `Expected $${expectedBalance.toFixed(2)}, found $${actualBalance.toFixed(2)} ` +
        `(difference: $${difference.toFixed(2)})`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
