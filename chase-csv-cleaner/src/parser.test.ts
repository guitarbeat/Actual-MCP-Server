/**
 * Tests for Chase CSV Parser
 */

import { describe, it, expect } from 'vitest';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { parseChaseCSV } from './parser.js';

describe('Chase CSV Parser', () => {
  // Helper to create a temporary CSV file
  function createTempCSV(content: string): string {
    const tempDir = mkdtempSync(join(tmpdir(), 'csv-test-'));
    const filePath = join(tempDir, 'test.csv');
    writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  // Helper to clean up temp file
  function cleanupTempFile(filePath: string): void {
    try {
      unlinkSync(filePath);
    } catch {
      // Ignore cleanup errors
    }
  }

  describe('parseChaseCSV', () => {
    it('should parse valid Chase CSV file', () => {
      const csvContent = `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
CREDIT,11/17/2023,"FEI COMPANY DIRECT DEP PPD ID: 9111111101",2351.69,ACH_CREDIT,32243.03,
DEBIT,11/20/2023,"APPLE GS SAVINGS TRANSFER",-20000.00,ACH_DEBIT,12243.03,`;
      
      const filePath = createTempCSV(csvContent);
      
      try {
        const transactions = parseChaseCSV(filePath);
        
        expect(transactions).toHaveLength(2);
        expect(transactions[0].details).toBe('CREDIT');
        expect(transactions[0].postingDate).toBe('11/17/2023');
        expect(transactions[0].description).toBe('FEI COMPANY DIRECT DEP PPD ID: 9111111101');
        expect(transactions[0].amount).toBe(2351.69);
        expect(transactions[0].type).toBe('ACH_CREDIT');
        expect(transactions[0].balance).toBe(32243.03);
        expect(transactions[0].checkOrSlip).toBe('');
      } finally {
        cleanupTempFile(filePath);
      }
    });

    it('should sort transactions chronologically (oldest first)', () => {
      const csvContent = `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,11/20/2023,"Transaction 3",-100.00,ACH_DEBIT,1000.00,
CREDIT,11/17/2023,"Transaction 1",100.00,ACH_CREDIT,1200.00,
DEBIT,11/18/2023,"Transaction 2",-50.00,ACH_DEBIT,1100.00,`;
      
      const filePath = createTempCSV(csvContent);
      
      try {
        const transactions = parseChaseCSV(filePath);
        
        expect(transactions).toHaveLength(3);
        expect(transactions[0].postingDate).toBe('11/17/2023');
        expect(transactions[1].postingDate).toBe('11/18/2023');
        expect(transactions[2].postingDate).toBe('11/20/2023');
      } finally {
        cleanupTempFile(filePath);
      }
    });

    it('should handle empty check or slip field', () => {
      const csvContent = `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,11/20/2023,"Test Transaction",-100.00,ACH_DEBIT,1000.00,`;
      
      const filePath = createTempCSV(csvContent);
      
      try {
        const transactions = parseChaseCSV(filePath);
        
        expect(transactions[0].checkOrSlip).toBe('');
      } finally {
        cleanupTempFile(filePath);
      }
    });

    it('should throw error for missing file', () => {
      expect(() => parseChaseCSV('/nonexistent/file.csv')).toThrow('Input file not found');
    });

    it('should throw error for empty CSV file', () => {
      const filePath = createTempCSV('');
      
      try {
        expect(() => parseChaseCSV(filePath)).toThrow('CSV file is empty');
      } finally {
        cleanupTempFile(filePath);
      }
    });

    it('should throw error for invalid headers', () => {
      const csvContent = `Wrong,Headers,Here
DEBIT,11/20/2023,"Test"`;
      
      const filePath = createTempCSV(csvContent);
      
      try {
        expect(() => parseChaseCSV(filePath)).toThrow('Invalid CSV structure');
      } finally {
        cleanupTempFile(filePath);
      }
    });

    it('should skip invalid rows and log warnings', () => {
      const csvContent = `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,11/20/2023,"Valid Transaction",-100.00,ACH_DEBIT,1000.00,
DEBIT,invalid-date,"Invalid Date",50.00,ACH_DEBIT,1050.00,
DEBIT,11/21/2023,"Another Valid",-25.00,ACH_DEBIT,975.00,`;
      
      const filePath = createTempCSV(csvContent);
      
      try {
        const transactions = parseChaseCSV(filePath);
        
        // Should have 2 valid transactions, skipping the invalid one
        expect(transactions).toHaveLength(2);
        expect(transactions[0].description).toBe('Valid Transaction');
        expect(transactions[1].description).toBe('Another Valid');
      } finally {
        cleanupTempFile(filePath);
      }
    });

    it('should throw error when amount is not a number', () => {
      const csvContent = `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,11/20/2023,"Test Transaction",not-a-number,ACH_DEBIT,1000.00,`;
      
      const filePath = createTempCSV(csvContent);
      
      try {
        expect(() => parseChaseCSV(filePath)).toThrow('No valid transactions found');
      } finally {
        cleanupTempFile(filePath);
      }
    });

    it('should throw error when balance is not a number', () => {
      const csvContent = `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,11/20/2023,"Test Transaction",-100.00,ACH_DEBIT,invalid-balance,`;
      
      const filePath = createTempCSV(csvContent);
      
      try {
        expect(() => parseChaseCSV(filePath)).toThrow('No valid transactions found');
      } finally {
        cleanupTempFile(filePath);
      }
    });

    it('should handle quoted fields with commas', () => {
      const csvContent = `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,11/20/2023,"Test, with, commas",-100.00,ACH_DEBIT,1000.00,`;
      
      const filePath = createTempCSV(csvContent);
      
      try {
        const transactions = parseChaseCSV(filePath);
        
        expect(transactions[0].description).toBe('Test, with, commas');
      } finally {
        cleanupTempFile(filePath);
      }
    });

    it('should skip rows with missing columns', () => {
      const csvContent = `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,11/20/2023,"Valid Transaction",-100.00,ACH_DEBIT,1000.00,
DEBIT,11/21/2023,"Missing columns"
DEBIT,11/22/2023,"Another Valid",-50.00,ACH_DEBIT,950.00,`;
      
      const filePath = createTempCSV(csvContent);
      
      try {
        const transactions = parseChaseCSV(filePath);
        
        expect(transactions).toHaveLength(2);
        expect(transactions[0].description).toBe('Valid Transaction');
        expect(transactions[1].description).toBe('Another Valid');
      } finally {
        cleanupTempFile(filePath);
      }
    });

    it('should skip rows with empty required fields', () => {
      const csvContent = `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,11/20/2023,"Valid Transaction",-100.00,ACH_DEBIT,1000.00,
,11/21/2023,"Missing Details",-50.00,ACH_DEBIT,950.00,
DEBIT,,"Missing Date",-25.00,ACH_DEBIT,925.00,
DEBIT,11/23/2023,"Another Valid",-10.00,ACH_DEBIT,915.00,`;
      
      const filePath = createTempCSV(csvContent);
      
      try {
        const transactions = parseChaseCSV(filePath);
        
        expect(transactions).toHaveLength(2);
        expect(transactions[0].description).toBe('Valid Transaction');
        expect(transactions[1].description).toBe('Another Valid');
      } finally {
        cleanupTempFile(filePath);
      }
    });

    it('should skip rows with infinite or NaN amounts', () => {
      const csvContent = `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,11/20/2023,"Valid Transaction",-100.00,ACH_DEBIT,1000.00,
DEBIT,11/21/2023,"Invalid Amount",Infinity,ACH_DEBIT,950.00,
DEBIT,11/22/2023,"Another Valid",-50.00,ACH_DEBIT,900.00,`;
      
      const filePath = createTempCSV(csvContent);
      
      try {
        const transactions = parseChaseCSV(filePath);
        
        expect(transactions).toHaveLength(2);
        expect(transactions[0].description).toBe('Valid Transaction');
        expect(transactions[1].description).toBe('Another Valid');
      } finally {
        cleanupTempFile(filePath);
      }
    });

    it('should skip rows with infinite or NaN balances', () => {
      const csvContent = `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,11/20/2023,"Valid Transaction",-100.00,ACH_DEBIT,1000.00,
DEBIT,11/21/2023,"Invalid Balance",-50.00,ACH_DEBIT,NaN,
DEBIT,11/22/2023,"Another Valid",-25.00,ACH_DEBIT,975.00,`;
      
      const filePath = createTempCSV(csvContent);
      
      try {
        const transactions = parseChaseCSV(filePath);
        
        expect(transactions).toHaveLength(2);
        expect(transactions[0].description).toBe('Valid Transaction');
        expect(transactions[1].description).toBe('Another Valid');
      } finally {
        cleanupTempFile(filePath);
      }
    });

    it('should skip completely empty rows', () => {
      const csvContent = `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,11/20/2023,"Valid Transaction",-100.00,ACH_DEBIT,1000.00,
,,,,,,,
DEBIT,11/22/2023,"Another Valid",-50.00,ACH_DEBIT,950.00,`;
      
      const filePath = createTempCSV(csvContent);
      
      try {
        const transactions = parseChaseCSV(filePath);
        
        expect(transactions).toHaveLength(2);
        expect(transactions[0].description).toBe('Valid Transaction');
        expect(transactions[1].description).toBe('Another Valid');
      } finally {
        cleanupTempFile(filePath);
      }
    });

    it('should throw error when no valid transactions found', () => {
      const csvContent = `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,invalid-date,"Bad Date",100.00,ACH_DEBIT,1000.00,
DEBIT,11/20/2023,"Bad Amount",not-a-number,ACH_DEBIT,1000.00,`;
      
      const filePath = createTempCSV(csvContent);
      
      try {
        expect(() => parseChaseCSV(filePath)).toThrow('No valid transactions found');
      } finally {
        cleanupTempFile(filePath);
      }
    });

    it('should provide detailed error messages for missing fields', () => {
      const csvContent = `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,11/20/2023,,-100.00,ACH_DEBIT,1000.00,`;
      
      const filePath = createTempCSV(csvContent);
      
      try {
        expect(() => parseChaseCSV(filePath)).toThrow('Missing required fields: Description');
      } finally {
        cleanupTempFile(filePath);
      }
    });
  });
});
