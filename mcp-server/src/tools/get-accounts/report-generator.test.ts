import { describe, expect, it } from 'vitest';
import { generateAccountsReport } from './report-generator.js';

describe('generateAccountsReport', () => {
  it('includes reportedBalance when balance_current is available', () => {
    const report = generateAccountsReport([
      {
        id: 'account-1',
        name: 'Checking',
        type: 'checking',
        balance: 123450,
        balance_current: 125000,
        closed: false,
        offbudget: false,
      },
    ]);

    expect(report.accounts).toEqual([
      {
        id: 'account-1',
        name: 'Checking',
        type: 'checking',
        balance: '$1,234.50',
        reportedBalance: '$1,250.00',
        closed: false,
        offBudget: false,
      },
    ]);
  });

  it('omits reportedBalance when balance_current is null or undefined', () => {
    const report = generateAccountsReport([
      {
        id: 'account-1',
        name: 'Checking',
        type: 'checking',
        balance: 123450,
        balance_current: null,
        closed: false,
        offbudget: false,
      },
    ]);

    expect(report.accounts[0]).not.toHaveProperty('reportedBalance');
  });
});
