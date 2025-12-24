import { describe, it, expect } from 'vitest';
import { GetTransactionsReportGenerator } from './report-generator.js';

describe('GetTransactionsReportGenerator', () => {
  it('generates a report with total amount', () => {
    const generator = new GetTransactionsReportGenerator();
    const mockTransactions = [
      { id: '1', date: '2024-01-01', payee: 'Store A', category: 'Food', amount: '$50.00', notes: '' },
      { id: '2', date: '2024-01-02', payee: 'Store B', category: 'Food', amount: '$25.00', notes: '' },
    ];

    // We cast to any because we are mocking the internal interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockMetadata: any = {
      accountReference: 'checking',
      resolvedAccountId: 'acc-123',
      dateRange: { start: '2024-01-01', end: '2024-01-31' },
      appliedFilters: ['Category: Food'],
      filteredCount: 2,
      totalFetched: 10,
      totalAmount: 7500, // 75.00 in cents
    };

    const report = generator.generate(mockTransactions, mockMetadata);

    expect(report).toContain('**Total amount:** $75.00');
  });

  it('handles negative total amount (expenses)', () => {
    const generator = new GetTransactionsReportGenerator();
    const mockTransactions: {
      id: string;
      date: string;
      payee: string;
      category: string;
      amount: string;
      notes: string;
    }[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockMetadata: any = {
      accountReference: 'checking',
      resolvedAccountId: 'acc-123',
      dateRange: { start: '2024-01-01', end: '2024-01-31' },
      appliedFilters: [],
      filteredCount: 0,
      totalFetched: 10,
      totalAmount: -12345, // -$123.45
    };

    const report = generator.generate(mockTransactions, mockMetadata);

    expect(report).toContain('**Total amount:** -$123.45');
  });
});
