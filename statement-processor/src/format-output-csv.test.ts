import { describe, it, expect } from 'vitest';
import { formatTransactionsToCSV } from './format-output-csv.js';
import { StartingBalanceEntry, ProcessedTransaction } from './types.js';

describe('formatTransactionsToCSV', () => {
  const mockStartingBalance: StartingBalanceEntry = {
    date: '2024-01-01',
    payee: 'Opening Balance',
    category: 'Income',
    notes: 'Initial deposit',
    amount: 1000,
  };

  it('should sanitize fields starting with formula triggers', () => {
    const maliciousTransactions: ProcessedTransaction[] = [
      {
        date: '2024-01-02',
        payee: '=1+1', // Formula
        category: '+Groceries', // Formula
        notes: '@malicious', // Formula
        amount: -50,
      },
      {
        date: '2024-01-03',
        payee: '-Test', // Formula
        category: '\tTab', // Tab
        notes: '\rReturn', // Carriage return
        amount: -20,
      },
    ];

    const csv = formatTransactionsToCSV(mockStartingBalance, maliciousTransactions);

    // Check if sanitization was applied (prepend ')
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'+Groceries");
    expect(csv).toContain("'@malicious");
    expect(csv).toContain("'-Test");
    expect(csv).toContain("'\tTab");
    expect(csv).toContain("'\rReturn");
  });

  it('should not modify safe fields', () => {
    const safeTransactions: ProcessedTransaction[] = [
      {
        date: '2024-01-02',
        payee: 'Safe Payee',
        category: 'Food',
        notes: 'Just notes',
        amount: -50,
      },
    ];

    const csv = formatTransactionsToCSV(mockStartingBalance, safeTransactions);

    expect(csv).toContain('"Safe Payee"');
    expect(csv).toContain('"Food"');
    expect(csv).toContain('"Just notes"');
    expect(csv).not.toContain("'Safe Payee");
  });
});
