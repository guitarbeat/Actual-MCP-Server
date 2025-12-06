/**
 * Tests for Transaction Processor
 */

import { describe, it, expect, vi } from 'vitest';
import {
  convertDateFormat,
  processTransaction,
  processAllTransactions,
} from './transaction-processor.js';
import { ChaseTransaction } from './types.js';
import { CategorizationEngine } from './categorization-engine.js';

describe('convertDateFormat', () => {
  it('should convert MM/DD/YYYY to YYYY-MM-DD', () => {
    expect(convertDateFormat('11/17/2023')).toBe('2023-11-17');
    expect(convertDateFormat('01/05/2024')).toBe('2024-01-05');
    expect(convertDateFormat('12/31/2023')).toBe('2023-12-31');
  });

  it('should pad single digit months and days', () => {
    expect(convertDateFormat('1/5/2024')).toBe('2024-01-05');
    expect(convertDateFormat('9/9/2023')).toBe('2023-09-09');
  });

  it('should throw error for invalid date format', () => {
    expect(() => convertDateFormat('2023-11-17')).toThrow('Invalid date format');
    expect(() => convertDateFormat('11/17')).toThrow('Invalid date format');
    expect(() => convertDateFormat('invalid')).toThrow('Invalid date format');
  });

  it('should throw error for invalid month', () => {
    expect(() => convertDateFormat('13/17/2023')).toThrow('Invalid month');
    expect(() => convertDateFormat('0/17/2023')).toThrow('Invalid month');
  });

  it('should throw error for invalid day', () => {
    expect(() => convertDateFormat('11/32/2023')).toThrow('Invalid day');
    expect(() => convertDateFormat('11/0/2023')).toThrow('Invalid day');
  });
});

describe('processTransaction', () => {
  it('should process a transaction through the complete pipeline', async () => {
    const transaction: ChaseTransaction = {
      details: 'CREDIT',
      postingDate: '11/17/2023',
      description: 'FEI COMPANY DIRECT DEP PPD ID: 9111111101',
      amount: 2351.69,
      type: 'ACH_CREDIT',
      balance: 32243.03,
      checkOrSlip: '',
    };

    const mockEngine = {
      categorizeTransaction: vi.fn().mockResolvedValue({
        category: 'Income: Salary',
        confidence: 'high',
      }),
    } as unknown as CategorizationEngine;

    const result = await processTransaction(transaction, mockEngine);

    expect(result.date).toBe('2023-11-17');
    expect(result.payee).toBe('FEI COMPANY DIRECT DEP');
    expect(result.category).toBe('Income: Salary');
    expect(result.amount).toBe(2351.69);
    expect(result.notes).toContain('FEI COMPANY DIRECT DEP PPD ID: 9111111101');
  });
});

describe('processAllTransactions', () => {
  it('should process all transactions successfully', async () => {
    const transactions: ChaseTransaction[] = [
      {
        details: 'CREDIT',
        postingDate: '11/17/2023',
        description: 'UNIV TX AUSTIN PAYROLL',
        amount: 2351.69,
        type: 'ACH_CREDIT',
        balance: 32243.03,
        checkOrSlip: '',
      },
      {
        details: 'DEBIT',
        postingDate: '11/20/2023',
        description: 'BILTPYMTS PAYMENT',
        amount: -1240.0,
        type: 'ACH_DEBIT',
        balance: 31003.03,
        checkOrSlip: '',
      },
    ];

    const mockEngine = {
      categorizeTransaction: vi.fn()
        .mockResolvedValueOnce({
          category: 'Income: Salary',
          confidence: 'high',
        })
        .mockResolvedValueOnce({
          category: 'Housing: Rent',
          confidence: 'high',
        }),
    } as unknown as CategorizationEngine;

    const { processed, stats } = await processAllTransactions(transactions, mockEngine);

    expect(processed).toHaveLength(2);
    expect(stats.total).toBe(2);
    expect(stats.successful).toBe(2);
    expect(stats.failed).toBe(0);
    expect(stats.errors).toHaveLength(0);
  });

  it('should handle errors gracefully and continue processing', async () => {
    const transactions: ChaseTransaction[] = [
      {
        details: 'CREDIT',
        postingDate: '11/17/2023',
        description: 'Valid Transaction',
        amount: 100.0,
        type: 'ACH_CREDIT',
        balance: 1000.0,
        checkOrSlip: '',
      },
      {
        details: 'DEBIT',
        postingDate: 'invalid-date',
        description: 'Invalid Transaction',
        amount: -50.0,
        type: 'ACH_DEBIT',
        balance: 950.0,
        checkOrSlip: '',
      },
      {
        details: 'CREDIT',
        postingDate: '11/18/2023',
        description: 'Another Valid Transaction',
        amount: 200.0,
        type: 'ACH_CREDIT',
        balance: 1150.0,
        checkOrSlip: '',
      },
    ];

    const mockEngine = {
      categorizeTransaction: vi.fn().mockResolvedValue({
        category: 'Uncategorized',
        confidence: 'low',
      }),
    } as unknown as CategorizationEngine;

    const { processed, stats } = await processAllTransactions(transactions, mockEngine);

    expect(processed).toHaveLength(2); // Only valid transactions
    expect(stats.total).toBe(3);
    expect(stats.successful).toBe(2);
    expect(stats.failed).toBe(1);
    expect(stats.errors).toHaveLength(1);
    expect(stats.errors[0].error).toContain('Invalid date format');
  });

  it('should call progress callback', async () => {
    const transactions: ChaseTransaction[] = [
      {
        details: 'CREDIT',
        postingDate: '11/17/2023',
        description: 'Transaction 1',
        amount: 100.0,
        type: 'ACH_CREDIT',
        balance: 1000.0,
        checkOrSlip: '',
      },
      {
        details: 'CREDIT',
        postingDate: '11/18/2023',
        description: 'Transaction 2',
        amount: 200.0,
        type: 'ACH_CREDIT',
        balance: 1200.0,
        checkOrSlip: '',
      },
    ];

    const mockEngine = {
      categorizeTransaction: vi.fn().mockResolvedValue({
        category: 'Uncategorized',
        confidence: 'low',
      }),
    } as unknown as CategorizationEngine;

    const progressCalls: Array<{ current: number; total: number }> = [];
    const onProgress = (current: number, total: number) => {
      progressCalls.push({ current, total });
    };

    await processAllTransactions(transactions, mockEngine, onProgress);

    expect(progressCalls).toHaveLength(2);
    expect(progressCalls[0]).toEqual({ current: 1, total: 2 });
    expect(progressCalls[1]).toEqual({ current: 2, total: 2 });
  });
});
