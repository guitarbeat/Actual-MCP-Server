import { describe, expect, it } from 'vitest';
import { GetTransactionsReportGenerator } from './report-generator.js';

describe('GetTransactionsReportGenerator', () => {
  const generator = new GetTransactionsReportGenerator();
  const mockTransactions = [
    {
      id: '1',
      date: '2024-03-20',
      payee: 'Amazon',
      category: 'Shopping',
      amount: '$100.00',
      notes: '',
    },
  ];

  it('should include total amount in report when provided', () => {
    const metadata = {
      accountReference: 'Checking',
      resolvedAccountId: 'acc-123',
      dateRange: { start: '2024-03-01', end: '2024-03-31' },
      appliedFilters: [],
      filteredCount: 1,
      totalFetched: 1,
      totalAmount: 10000, // $100.00
    };

    const report = generator.generate(mockTransactions, metadata);
    expect(report).toContain('**Total amount:** $100.00');
  });

  it('should not include total amount when not provided', () => {
    const metadata = {
      accountReference: 'Checking',
      resolvedAccountId: 'acc-123',
      dateRange: { start: '2024-03-01', end: '2024-03-31' },
      appliedFilters: [],
      filteredCount: 1,
      totalFetched: 1,
    };

    const report = generator.generate(mockTransactions, metadata);
    expect(report).not.toContain('**Total amount:**');
  });
});
