/**
 * Balance Calculator for Chase CSV Import Tool
 * 
 * Calculates the starting balance from transaction history to enable
 * proper account reconciliation in Actual Budget.
 */

import { format, subDays, parse as parseDate } from 'date-fns';
import { ChaseTransaction, StartingBalanceEntry } from './types.js';

/**
 * Calculate the starting balance from a list of transactions
 * 
 * The starting balance is calculated by taking the balance after the earliest
 * transaction and subtracting that transaction's amount.
 * 
 * Formula: Starting Balance = Balance After First Transaction - First Transaction Amount
 * 
 * @param transactions - Array of Chase transactions (should be sorted chronologically)
 * @returns Starting balance entry ready for CSV output
 * @throws Error if transactions array is empty
 */
export function calculateStartingBalance(transactions: ChaseTransaction[]): StartingBalanceEntry {
  // Handle edge case: empty transaction list
  if (!transactions || transactions.length === 0) {
    throw new Error('Cannot calculate starting balance: No transactions provided');
  }

  // Handle edge case: single transaction
  // For a single transaction, we still calculate the starting balance the same way
  const earliestTransaction = transactions[0];
  
  // Calculate starting balance: balance after transaction - transaction amount
  const startingBalance = earliestTransaction.balance - earliestTransaction.amount;
  
  // Parse the earliest transaction date
  const earliestDate = parseDate(earliestTransaction.postingDate, 'MM/dd/yyyy', new Date());
  
  // Set starting balance date to one day before the earliest transaction
  const startingBalanceDate = subDays(earliestDate, 1);
  
  // Format date as YYYY-MM-DD for Actual Budget compatibility
  const formattedDate = format(startingBalanceDate, 'yyyy-MM-dd');
  
  // Create the starting balance entry
  const startingBalanceEntry: StartingBalanceEntry = {
    date: formattedDate,
    payee: 'Starting Balance',
    category: 'Transfer: Internal',
    notes: 'Opening balance for account',
    amount: startingBalance,
  };
  
  return startingBalanceEntry;
}
