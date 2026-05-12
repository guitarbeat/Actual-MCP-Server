import { describe, it, expect } from 'vitest';
import {
  parseCsvRows,
  resolveSupplementalAccount,
  normalizeSupplementalRows,
  buildSupplementalLookupKey,
  findExactSupplementalMatch,
} from './supplemental.js';
import type { Account, Transaction } from '../../types/domain.js';
import type { SupplementalCsvRow, NormalizedSupplementalRow } from './types.js';

describe('supplemental', () => {
  describe('parseCsvRows', () => {
    it('should parse valid CSV text into objects', () => {
      const csv = `Date,Amount,Description\n2025-01-01,10.50,Test`;
      const result = parseCsvRows<{ Date: string; Amount: string; Description: string }>(csv);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ Date: '2025-01-01', Amount: '10.50', Description: 'Test' });
    });

    it('should skip empty lines and trim spaces', () => {
      const csv = `Date, Amount , Description \n\n2025-01-01, 10.50 , Test \n`;
      const result = parseCsvRows<{ Date: string; Amount: string; Description: string }>(csv);
      expect(result).toHaveLength(1);
      expect(result[0].Amount).toBe('10.50');
      expect(result[0].Description).toBe('Test');
    });
  });

  describe('resolveSupplementalAccount', () => {
    const accounts: Account[] = [
      { id: 'acc-1', name: 'Chase Checking', offbudget: false, closed: false, balance: 0 },
      { id: 'acc-2', name: 'Amex Credit Card', offbudget: false, closed: false, balance: 0 },
      { id: 'acc-3', name: 'Citi Savings', offbudget: false, closed: false, balance: 0 },
    ];

    it('should find exact match by exact text', () => {
      const result = resolveSupplementalAccount('Chase Checking', accounts);
      expect(result).toEqual({ actualAccountId: 'acc-1', actualAccountName: 'Chase Checking' });
    });

    it('should find match by overlap and containment', () => {
      const result = resolveSupplementalAccount('Amex', accounts);
      expect(result).toEqual({ actualAccountId: 'acc-2', actualAccountName: 'Amex Credit Card' });
    });

    it('should return null if no good match is found', () => {
      const result = resolveSupplementalAccount('Wells Fargo', accounts);
      expect(result).toEqual({ actualAccountId: null, actualAccountName: null });
    });
  });

  describe('normalizeSupplementalRows', () => {
    const accounts: Account[] = [
      { id: 'acc-1', name: 'Chase', offbudget: false, closed: false, balance: 0 },
    ];

    it('should normalize valid rows within date range', () => {
      const rows: SupplementalCsvRow[] = [
        {
          Date: '2025-08-15',
          Description: 'Test Desc',
          'Statement description': 'Test Stmt',
          Type: 'Sale',
          Category: 'Shopping',
          Amount: '15.99',
          Account: 'Chase',
          Tags: '',
          Notes: 'A note',
        },
      ];

      const result = normalizeSupplementalRows(rows, accounts, '2025-08-01', '2025-08-31');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: '2025-08-15',
        description: 'Test Desc',
        statementDescription: 'Test Stmt',
        type: 'Sale',
        category: 'Shopping',
        amountCents: 1599, // Assuming parseMoneyToCents returns integer cents
        accountName: 'Chase',
        actualAccountId: 'acc-1',
        actualAccountName: 'Chase',
        notes: 'A note',
      });
    });

    it('should filter out rows outside the date range', () => {
      const rows: SupplementalCsvRow[] = [
        {
          Date: '2025-07-31', // Before
          Description: '',
          'Statement description': '',
          Type: '',
          Category: '',
          Amount: '0',
          Account: '',
          Tags: '',
          Notes: '',
        },
        {
          Date: '2025-09-01', // After
          Description: '',
          'Statement description': '',
          Type: '',
          Category: '',
          Amount: '0',
          Account: '',
          Tags: '',
          Notes: '',
        },
      ];

      const result = normalizeSupplementalRows(rows, accounts, '2025-08-01', '2025-08-31');
      expect(result).toHaveLength(0);
    });
  });

  describe('buildSupplementalLookupKey', () => {
    it('should build lookup key correctly', () => {
      expect(buildSupplementalLookupKey('2025-08-15', 1599, 'acc-1')).toBe('2025-08-15|1599|acc-1');
    });

    it('should use "unmapped" if accountId is null', () => {
      expect(buildSupplementalLookupKey('2025-08-15', 1599, null)).toBe('2025-08-15|1599|unmapped');
    });
  });

  describe('findExactSupplementalMatch', () => {
    const matchesByKey = new Map<string, NormalizedSupplementalRow[]>();
    const transaction: Transaction = {
      id: 'tx-1',
      date: '2025-08-15',
      amount: 1599,
      account: 'acc-1',
      payee: 'p-1',
      payee_name: 'Test Merchant',
      category: 'c-1',
      notes: '',
      cleared: true,
      imported_id: null,
      transfer_id: null,
      subtransactions: [],
      imported_payee: 'Test Merchant Inc',
    };

    it('should return null row if no candidates match key', () => {
      const result = findExactSupplementalMatch(transaction, matchesByKey);
      expect(result).toEqual({ row: null });
    });

    it('should find exactly one match by merchant name', () => {
      const row: NormalizedSupplementalRow = {
        date: '2025-08-15',
        amountCents: 1599,
        actualAccountId: 'acc-1',
        description: 'Test Merchant Inc',
        statementDescription: '',
        normalizedDescription: 'testmerchantinc',
        normalizedStatementDescription: '',
        type: '',
        category: '',
        accountName: '',
        actualAccountName: '',
        notes: '',
      };
      const key = buildSupplementalLookupKey(
        transaction.date,
        transaction.amount,
        transaction.account,
      );
      matchesByKey.set(key, [row]);

      const result = findExactSupplementalMatch(transaction, matchesByKey);
      expect(result).toEqual({ row });
    });

    it('should return blocked result if multiple rows match', () => {
      const row1: NormalizedSupplementalRow = {
        date: '2025-08-15',
        amountCents: 1599,
        actualAccountId: 'acc-1',
        description: 'Test Merchant Inc',
        statementDescription: '',
        normalizedDescription: '',
        normalizedStatementDescription: '',
        type: '',
        category: '',
        accountName: '',
        actualAccountName: '',
        notes: '',
      };
      const row2: NormalizedSupplementalRow = {
        date: '2025-08-15',
        amountCents: 1599,
        actualAccountId: 'acc-1',
        description: 'Test Merchant Inc',
        statementDescription: '',
        normalizedDescription: '',
        normalizedStatementDescription: '',
        type: '',
        category: '',
        accountName: '',
        actualAccountName: '',
        notes: '',
      };
      const key = buildSupplementalLookupKey(
        transaction.date,
        transaction.amount,
        transaction.account,
      );
      matchesByKey.set(key, [row1, row2]);

      const result = findExactSupplementalMatch(transaction, matchesByKey);
      expect(result.row).toBeNull();
      expect(result.blockedReason).toMatch(/Multiple/);
    });

    it('should return blocked result if candidate exists but no name match', () => {
      const row: NormalizedSupplementalRow = {
        date: '2025-08-15',
        amountCents: 1599,
        actualAccountId: 'acc-1',
        description: 'Different Merchant',
        statementDescription: '',
        normalizedDescription: '',
        normalizedStatementDescription: '',
        type: '',
        category: '',
        accountName: '',
        actualAccountName: '',
        notes: '',
      };
      const key = buildSupplementalLookupKey(
        transaction.date,
        transaction.amount,
        transaction.account,
      );
      matchesByKey.set(key, [row]);

      const result = findExactSupplementalMatch(transaction, matchesByKey);
      expect(result.row).toBeNull();
      expect(result.blockedReason).toMatch(/merchant text did not match/);
    });
  });
});
