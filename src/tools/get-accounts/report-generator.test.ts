import { describe, it, expect } from 'vitest';
import { GetAccountsReportGenerator } from './report-generator.js';
import type { AccountWithBalance } from './data-fetcher.js';

describe('GetAccountsReportGenerator', () => {
  const generator = new GetAccountsReportGenerator();

  it('should format accounts with all fields', () => {
    const accounts: AccountWithBalance[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Checking',
        type: 'checking',
        closed: false,
        offbudget: false,
        balance: 10000,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Savings',
        type: 'savings',
        closed: true,
        offbudget: true,
        balance: 50000,
      },
    ];

    const result = generator.generate(accounts);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Checking',
      type: 'checking',
      balance: '$100.00',
      closed: false,
      offBudget: false,
    });
    expect(result[1]).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Savings',
      type: 'savings',
      balance: '$500.00',
      closed: true,
      offBudget: true,
    });
  });

  it('should handle accounts without type', () => {
    const accounts: AccountWithBalance[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Generic Account',
        type: undefined,
        closed: false,
        offbudget: false,
        balance: 0,
      },
    ];

    const result = generator.generate(accounts);

    expect(result[0].type).toBe('Account');
  });

  it('should handle empty account list', () => {
    const result = generator.generate([]);

    expect(result).toHaveLength(0);
  });
});
