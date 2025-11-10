/**
 * Tests for Balance Calculator
 */

import { describe, it, expect } from 'vitest';
import { calculateStartingBalance } from './balance-calculator.js';
import { ChaseTransaction } from './types.js';

describe('calculateStartingBalance', () => {
  it('should calculate starting balance correctly for multiple transactions', () => {
    const transactions: ChaseTransaction[] = [
      {
        details: 'CREDIT',
        postingDate: '11/17/2023',
        description: 'PAYROLL DEPOSIT',
        amount: 2351.69,
        type: 'ACH_CREDIT',
        balance: 32243.03,
        checkOrSlip: '',
      },
      {
        details: 'DEBIT',
        postingDate: '11/20/2023',
        description: 'TRANSFER OUT',
        amount: -20000.00,
        type: 'ACH_DEBIT',
        balance: 12243.03,
        checkOrSlip: '',
      },
    ];

    const result = calculateStartingBalance(transactions);

    // Starting balance = 32243.03 - 2351.69 = 29891.34
    expect(result.amount).toBe(29891.34);
    expect(result.date).toBe('2023-11-16'); // One day before 11/17/2023
    expect(result.payee).toBe('Starting Balance');
    expect(result.category).toBe('Transfer: Internal');
    expect(result.notes).toBe('Opening balance for account');
  });

  it('should handle single transaction correctly', () => {
    const transactions: ChaseTransaction[] = [
      {
        details: 'CREDIT',
        postingDate: '01/15/2024',
        description: 'DEPOSIT',
        amount: 1000.00,
        type: 'MISC_CREDIT',
        balance: 5000.00,
        checkOrSlip: '',
      },
    ];

    const result = calculateStartingBalance(transactions);

    // Starting balance = 5000.00 - 1000.00 = 4000.00
    expect(result.amount).toBe(4000.00);
    expect(result.date).toBe('2024-01-14'); // One day before 01/15/2024
    expect(result.payee).toBe('Starting Balance');
  });

  it('should handle negative transaction amounts (debits)', () => {
    const transactions: ChaseTransaction[] = [
      {
        details: 'DEBIT',
        postingDate: '03/10/2024',
        description: 'PURCHASE',
        amount: -50.00,
        type: 'ACH_DEBIT',
        balance: 950.00,
        checkOrSlip: '',
      },
    ];

    const result = calculateStartingBalance(transactions);

    // Starting balance = 950.00 - (-50.00) = 1000.00
    expect(result.amount).toBe(1000.00);
    expect(result.date).toBe('2024-03-09'); // One day before 03/10/2024
  });

  it('should throw error for empty transaction list', () => {
    expect(() => calculateStartingBalance([])).toThrow(
      'Cannot calculate starting balance: No transactions provided'
    );
  });

  it('should handle transactions with decimal precision', () => {
    const transactions: ChaseTransaction[] = [
      {
        details: 'CREDIT',
        postingDate: '06/01/2024',
        description: 'INTEREST',
        amount: 0.15,
        type: 'MISC_CREDIT',
        balance: 1234.56,
        checkOrSlip: '',
      },
    ];

    const result = calculateStartingBalance(transactions);

    // Starting balance = 1234.56 - 0.15 = 1234.41
    expect(result.amount).toBeCloseTo(1234.41, 2);
  });

  it('should use the first transaction when transactions are sorted', () => {
    const transactions: ChaseTransaction[] = [
      {
        details: 'CREDIT',
        postingDate: '01/01/2024',
        description: 'FIRST TRANSACTION',
        amount: 100.00,
        type: 'MISC_CREDIT',
        balance: 600.00,
        checkOrSlip: '',
      },
      {
        details: 'DEBIT',
        postingDate: '01/05/2024',
        description: 'LATER TRANSACTION',
        amount: -50.00,
        type: 'ACH_DEBIT',
        balance: 550.00,
        checkOrSlip: '',
      },
    ];

    const result = calculateStartingBalance(transactions);

    // Should use first transaction: 600.00 - 100.00 = 500.00
    expect(result.amount).toBe(500.00);
    expect(result.date).toBe('2023-12-31'); // One day before 01/01/2024
  });
});
