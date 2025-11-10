/**
 * Tests for CSV Formatter
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile, unlink } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import {
  formatTransactionsToCSV,
  generateOutputFilename,
  writeCSVToFile,
  formatAndWriteCSV,
} from './csv-formatter.js';
import { ProcessedTransaction, StartingBalanceEntry } from './types.js';

describe('CSV Formatter', () => {
  describe('formatTransactionsToCSV', () => {
    it('should generate CSV with correct header row', () => {
      const startingBalance: StartingBalanceEntry = {
        date: '2023-11-16',
        payee: 'Starting Balance',
        category: 'Transfer: Internal',
        notes: 'Opening balance for account',
        amount: 29891.34,
      };

      const transactions: ProcessedTransaction[] = [];

      const csv = formatTransactionsToCSV(startingBalance, transactions);

      // Check that header is present (fields are quoted)
      expect(csv).toContain('"Date","Payee","Category","Notes","Amount"');
    });

    it('should include starting balance as first data row', () => {
      const startingBalance: StartingBalanceEntry = {
        date: '2023-11-16',
        payee: 'Starting Balance',
        category: 'Transfer: Internal',
        notes: 'Opening balance for account',
        amount: 29891.34,
      };

      const transactions: ProcessedTransaction[] = [];

      const csv = formatTransactionsToCSV(startingBalance, transactions);

      // Parse CSV to verify structure
      const records = parse(csv, { columns: true }) as Array<Record<string, string>>;
      expect(records).toHaveLength(1);
      expect(records[0]).toEqual({
        Date: '2023-11-16',
        Payee: 'Starting Balance',
        Category: 'Transfer: Internal',
        Notes: 'Opening balance for account',
        Amount: '29891.34',
      });
    });

    it('should add all processed transactions in order', () => {
      const startingBalance: StartingBalanceEntry = {
        date: '2023-11-16',
        payee: 'Starting Balance',
        category: 'Transfer: Internal',
        notes: 'Opening balance for account',
        amount: 29891.34,
      };

      const transactions: ProcessedTransaction[] = [
        {
          date: '2023-11-17',
          payee: 'FEI Company',
          category: 'Income: Salary',
          notes: 'FEI COMPANY DIRECT DEP PPD ID: 9111111101',
          amount: 2351.69,
        },
        {
          date: '2023-11-20',
          payee: 'Apple Savings',
          category: 'Transfer: Savings',
          notes: 'APPLE GS SAVINGS TRANSFER 910161010054 WEB ID: 2222229999',
          amount: -20000.0,
        },
      ];

      const csv = formatTransactionsToCSV(startingBalance, transactions);

      // Parse CSV to verify all transactions are present
      const records = parse(csv, { columns: true }) as Array<Record<string, string>>;
      expect(records).toHaveLength(3); // Starting balance + 2 transactions

      // Verify starting balance
      expect(records[0].Payee).toBe('Starting Balance');

      // Verify transactions in order
      expect(records[1].Payee).toBe('FEI Company');
      expect(records[1].Date).toBe('2023-11-17');
      expect(records[1].Amount).toBe('2351.69');

      expect(records[2].Payee).toBe('Apple Savings');
      expect(records[2].Date).toBe('2023-11-20');
      expect(records[2].Amount).toBe('-20000');
    });

    it('should properly quote fields containing commas', () => {
      const startingBalance: StartingBalanceEntry = {
        date: '2023-11-16',
        payee: 'Starting Balance',
        category: 'Transfer: Internal',
        notes: 'Opening balance for account',
        amount: 0,
      };

      const transactions: ProcessedTransaction[] = [
        {
          date: '2023-11-17',
          payee: 'Store, Inc.',
          category: 'Shopping: General',
          notes: 'Purchase at Store, Inc. on Main St, Austin, TX',
          amount: -50.0,
        },
      ];

      const csv = formatTransactionsToCSV(startingBalance, transactions);

      // Verify CSV can be parsed correctly
      const records = parse(csv, { columns: true }) as Array<Record<string, string>>;
      expect(records[1].Payee).toBe('Store, Inc.');
      expect(records[1].Notes).toBe('Purchase at Store, Inc. on Main St, Austin, TX');
    });

    it('should handle special characters in fields', () => {
      const startingBalance: StartingBalanceEntry = {
        date: '2023-11-16',
        payee: 'Starting Balance',
        category: 'Transfer: Internal',
        notes: 'Opening balance for account',
        amount: 0,
      };

      const transactions: ProcessedTransaction[] = [
        {
          date: '2023-11-17',
          payee: 'Café "Deluxe"',
          category: 'Food: Dining Out',
          notes: 'Payment with "special" characters & symbols',
          amount: -25.5,
        },
      ];

      const csv = formatTransactionsToCSV(startingBalance, transactions);

      // Verify CSV can be parsed correctly
      const records = parse(csv, { columns: true }) as Array<Record<string, string>>;
      expect(records[1].Payee).toBe('Café "Deluxe"');
      expect(records[1].Notes).toBe('Payment with "special" characters & symbols');
    });

    it('should handle newlines in description fields', () => {
      const startingBalance: StartingBalanceEntry = {
        date: '2023-11-16',
        payee: 'Starting Balance',
        category: 'Transfer: Internal',
        notes: 'Opening balance for account',
        amount: 0,
      };

      const transactions: ProcessedTransaction[] = [
        {
          date: '2023-11-17',
          payee: 'Multi-line Store',
          category: 'Shopping: General',
          notes: 'Line 1\nLine 2\nLine 3',
          amount: -100.0,
        },
      ];

      const csv = formatTransactionsToCSV(startingBalance, transactions);

      // Verify CSV can be parsed correctly
      const records = parse(csv, { columns: true }) as Array<Record<string, string>>;
      expect(records[1].Notes).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('generateOutputFilename', () => {
    it('should generate filename with default base name', () => {
      const filename = generateOutputFilename();
      expect(filename).toMatch(/^ChaseChecking_Cleaned_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('should generate filename with custom base name', () => {
      const filename = generateOutputFilename('CustomBank');
      expect(filename).toMatch(/^CustomBank_Cleaned_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('should include current date in filename', () => {
      const filename = generateOutputFilename();
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      expect(filename).toContain(today);
    });
  });

  describe('writeCSVToFile', () => {
    const testFilePath = './test-output.csv';

    afterEach(async () => {
      // Clean up test file
      try {
        await unlink(testFilePath);
      } catch {
        // File might not exist, ignore error
      }
    });

    it('should write CSV content to file with UTF-8 encoding', async () => {
      const csvContent = 'Date,Payee,Category,Notes,Amount\n2023-11-17,Test,Category,Notes,100.00';

      await writeCSVToFile(csvContent, testFilePath);

      // Read file and verify content
      const fileContent = await readFile(testFilePath, 'utf-8');
      expect(fileContent).toBe(csvContent);
    });

    it('should throw error if file write fails', async () => {
      const csvContent = 'test content';
      const invalidPath = '/invalid/path/that/does/not/exist/file.csv';

      await expect(writeCSVToFile(csvContent, invalidPath)).rejects.toThrow(
        /Output directory does not exist/
      );
    });
  });

  describe('formatAndWriteCSV', () => {
    const testFilePath = './test-complete-output.csv';

    afterEach(async () => {
      // Clean up test file
      try {
        await unlink(testFilePath);
      } catch {
        // File might not exist, ignore error
      }
    });

    it('should format and write complete CSV file', async () => {
      const startingBalance: StartingBalanceEntry = {
        date: '2023-11-16',
        payee: 'Starting Balance',
        category: 'Transfer: Internal',
        notes: 'Opening balance for account',
        amount: 1000.0,
      };

      const transactions: ProcessedTransaction[] = [
        {
          date: '2023-11-17',
          payee: 'Test Payee',
          category: 'Test Category',
          notes: 'Test notes',
          amount: -50.0,
        },
      ];

      await formatAndWriteCSV(startingBalance, transactions, testFilePath);

      // Read and verify file content
      const fileContent = await readFile(testFilePath, 'utf-8');
      const records = parse(fileContent, { columns: true }) as Array<Record<string, string>>;

      expect(records).toHaveLength(2);
      expect(records[0].Payee).toBe('Starting Balance');
      expect(records[1].Payee).toBe('Test Payee');
    });
  });
});
