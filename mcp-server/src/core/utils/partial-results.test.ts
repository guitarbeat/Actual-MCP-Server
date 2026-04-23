import { describe, it, expect } from 'vitest';
import { formatAccountDataWarnings, type AccountDataWarning } from './partial-results.js';

describe('partial-results', () => {
  describe('formatAccountDataWarnings', () => {
    it('should format multiple warnings correctly', () => {
      const warnings: AccountDataWarning[] = [
        {
          accountId: '1',
          accountName: 'Checking',
          operation: 'balances',
          error: 'Network error',
        },
        {
          accountId: '2',
          accountName: 'Savings',
          operation: 'transactions',
          error: 'Auth error',
        },
      ];

      const result = formatAccountDataWarnings(warnings);

      expect(result).toEqual([
        'Checking: balances unavailable (Network error)',
        'Savings: transactions unavailable (Auth error)',
      ]);
    });

    it('should handle an empty warnings array', () => {
      const result = formatAccountDataWarnings([]);
      expect(result).toEqual([]);
    });

    it('should handle warnings with missing or empty error strings', () => {
      const warnings: AccountDataWarning[] = [
        {
          accountId: '1',
          accountName: 'Checking',
          operation: 'balances',
          error: '',
        },
      ];

      const result = formatAccountDataWarnings(warnings);

      expect(result).toEqual(['Checking: balances unavailable (unknown error)']);
    });
  });
});
