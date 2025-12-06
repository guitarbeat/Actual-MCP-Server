/**
 * Tests for Payee Cleaner
 */

import { describe, it, expect } from 'vitest';
import { cleanPayeeName } from './payee-cleaner.js';

describe('cleanPayeeName', () => {
  describe('Basic payee extraction', () => {
    it('should extract simple payee name', () => {
      const result = cleanPayeeName('AMAZON.COM', 'ACH_DEBIT');
      expect(result.payee).toBe('AMAZON.COM');
      expect(result.notes).toContain('AMAZON.COM');
    });

    it('should normalize whitespace', () => {
      const result = cleanPayeeName('AMAZON    MARKETPLACE', 'ACH_DEBIT');
      expect(result.payee).toBe('AMAZON MARKETPLACE');
    });

    it('should handle empty description', () => {
      const result = cleanPayeeName('', 'ACH_DEBIT');
      expect(result.payee).toBe('Unknown');
      expect(result.notes).toBe('');
    });

    it('should handle very long payee names', () => {
      const longDescription = 'A'.repeat(150);
      const result = cleanPayeeName(longDescription, 'ACH_DEBIT');
      expect(result.payee.length).toBeLessThanOrEqual(104); // 100 + '...'
      expect(result.payee).toContain('...');
    });
  });

  describe('Reference ID extraction', () => {
    it('should extract PPD ID to notes', () => {
      const result = cleanPayeeName('FEI COMPANY DIRECT DEP PPD ID: 9111111101', 'ACH_CREDIT');
      expect(result.payee).toBe('FEI COMPANY DIRECT DEP');
      expect(result.notes).toContain('PPD ID: 9111111101');
    });

    it('should extract WEB ID to notes', () => {
      const result = cleanPayeeName('APPLE GS SAVINGS TRANSFER WEB ID: 2222229999', 'ACCT_XFER');
      expect(result.payee).toContain('Transfer');
      expect(result.notes).toContain('WEB ID: 2222229999');
    });

    it('should extract CTX ID to notes', () => {
      const result = cleanPayeeName('PAYMENT TO VENDOR CTX ID: 123456', 'ACH_DEBIT');
      expect(result.notes).toContain('CTX ID: 123456');
    });

    it('should extract multiple IDs', () => {
      const result = cleanPayeeName('PAYMENT PPD ID: 111 WEB ID: 222', 'ACH_DEBIT');
      expect(result.notes).toContain('PPD ID: 111');
      expect(result.notes).toContain('WEB ID: 222');
    });
  });

  describe('Payment keyword removal', () => {
    it('should remove PAYMENT keyword', () => {
      const result = cleanPayeeName('VENDOR PAYMENT', 'ACH_DEBIT');
      expect(result.payee).toBe('VENDOR');
    });

    it('should remove AUTOPAY keyword', () => {
      const result = cleanPayeeName('UTILITY COMPANY AUTOPAY', 'ACH_DEBIT');
      expect(result.payee).toBe('UTILITY COMPANY');
    });

    it('should remove ONLINE PMT keyword', () => {
      const result = cleanPayeeName('CREDIT CARD ONLINE PMT', 'ACH_DEBIT');
      expect(result.payee).toBe('CREDIT CARD');
    });
  });

  describe('Zelle transactions', () => {
    it('should extract recipient from Zelle payment to', () => {
      const result = cleanPayeeName('Zelle payment to John Doe Conf# 12345', 'ACH_DEBIT');
      expect(result.payee).toBe('John Doe');
      expect(result.notes).toContain('Zelle payment to John Doe');
    });

    it('should extract sender from Zelle payment from', () => {
      const result = cleanPayeeName('Zelle payment from Jane Smith Conf# 67890', 'ACH_CREDIT');
      expect(result.payee).toBe('Jane Smith');
      expect(result.notes).toContain('Zelle payment from Jane Smith');
    });

    it('should handle Zelle without confirmation number', () => {
      const result = cleanPayeeName('Zelle payment to Bob Johnson', 'ACH_DEBIT');
      expect(result.payee).toBe('Bob Johnson');
    });

    it('should remove Zelle reference codes while preserving names', () => {
      const result = cleanPayeeName('Zelle payment to Alice Cooper Conf# ABC123XYZ', 'ACH_DEBIT');
      expect(result.payee).toBe('Alice Cooper');
      expect(result.payee).not.toContain('Conf#');
      expect(result.payee).not.toContain('ABC123XYZ');
      expect(result.notes).toContain('Conf# ABC123XYZ');
    });

    it('should handle Zelle with case variations', () => {
      const result = cleanPayeeName('ZELLE PAYMENT TO ROBERT SMITH', 'ACH_DEBIT');
      expect(result.payee).toBe('ROBERT SMITH');
    });

    it('should handle Zelle payment from with multiple words in name', () => {
      const result = cleanPayeeName('Zelle payment from Mary Jane Watson Conf# 999', 'ACH_CREDIT');
      expect(result.payee).toBe('Mary Jane Watson');
      expect(result.notes).toContain('Zelle payment from Mary Jane Watson');
    });
  });

  describe('Account transfers', () => {
    it('should identify account transfers by type', () => {
      const result = cleanPayeeName('TRANSFER TO SAVINGS 1234', 'ACCT_XFER');
      expect(result.payee).toContain('Transfer');
      expect(result.payee).toContain('SAVINGS');
    });

    it('should identify transfers by description', () => {
      const result = cleanPayeeName('Transfer from Checking to Savings', 'ACH_DEBIT');
      expect(result.payee).toContain('Transfer');
    });

    it('should handle generic transfers', () => {
      const result = cleanPayeeName('INTERNAL TRANSFER', 'ACCT_XFER');
      expect(result.payee).toBe('Account Transfer');
    });

    it('should format transfer with destination account name', () => {
      const result = cleanPayeeName('Transfer to Savings Account', 'ACCT_XFER');
      expect(result.payee).toBe('Transfer: Savings Account');
      expect(result.notes).toContain('Transfer to Savings Account');
    });

    it('should format transfer from source account', () => {
      const result = cleanPayeeName('Transfer from Checking', 'ACCT_XFER');
      expect(result.payee).toBe('Transfer: Checking');
    });

    it('should handle transfer with account numbers', () => {
      const result = cleanPayeeName('TRANSFER TO SAVINGS 910161010054', 'ACCT_XFER');
      expect(result.payee).toContain('Transfer');
      expect(result.payee).toContain('SAVINGS');
      expect(result.notes).toContain('910161010054');
    });

    it('should preserve full transfer description in notes', () => {
      const result = cleanPayeeName('APPLE GS SAVINGS TRANSFER 910161010054 WEB ID: 2222229999', 'ACCT_XFER');
      expect(result.payee).toContain('Transfer');
      expect(result.notes).toContain('APPLE GS SAVINGS TRANSFER');
      expect(result.notes).toContain('WEB ID: 2222229999');
    });
  });

  describe('Check deposits', () => {
    it('should identify check deposits by type', () => {
      const result = cleanPayeeName('CHECK DEPOSIT 12345', 'CHECK_DEPOSIT');
      expect(result.payee).toBe('Check Deposit');
    });

    it('should identify check deposits by description', () => {
      const result = cleanPayeeName('Mobile Check Deposit', 'MISC_CREDIT');
      expect(result.payee).toBe('Check Deposit');
    });
  });

  describe('Recurring merchants', () => {
    it('should clean Robinhood Card', () => {
      const result = cleanPayeeName('Robinhood Card PAYMENT PPD ID: 123', 'ACH_DEBIT');
      expect(result.payee).toBe('Robinhood Card');
      expect(result.notes).toContain('PPD ID: 123');
    });

    it('should clean Apple Card GSBANK', () => {
      const result = cleanPayeeName('APPLECARD GSBANK PAYMENT', 'ACH_DEBIT');
      expect(result.payee).toBe('Apple Card');
    });

    it('should clean Grande Communications', () => {
      const result = cleanPayeeName('GRANDE COMMUNICA AUTOPAY WEB ID: 456', 'ACH_DEBIT');
      expect(result.payee).toBe('Grande Communications');
      expect(result.notes).toContain('WEB ID: 456');
    });

    it('should clean Bilt Payments', () => {
      const result = cleanPayeeName('BILTPYMTS PAYMENT PPD ID: 789', 'ACH_DEBIT');
      expect(result.payee).toBe('Bilt Payments');
      expect(result.notes).toContain('PPD ID: 789');
    });
  });

  describe('Complex real-world examples', () => {
    it('should handle payroll with PPD ID', () => {
      const result = cleanPayeeName('UNIV TX AUSTIN PAYROLL PPD ID: 9111111101', 'ACH_CREDIT');
      expect(result.payee).toBe('UNIV TX AUSTIN PAYROLL');
      expect(result.notes).toContain('PPD ID: 9111111101');
      expect(result.notes).toContain('UNIV TX AUSTIN PAYROLL');
    });

    it('should handle savings transfer with WEB ID', () => {
      const result = cleanPayeeName('APPLE GS SAVINGS TRANSFER 910161010054 WEB ID: 2222229999', 'ACCT_XFER');
      expect(result.payee).toContain('Transfer');
      expect(result.notes).toContain('WEB ID: 2222229999');
    });

    it('should handle credit card payment with multiple keywords', () => {
      const result = cleanPayeeName('CHASE CREDIT CRD AUTOPAY ONLINE PAYMENT', 'ACH_DEBIT');
      expect(result.payee).toBe('CHASE CREDIT CRD');
    });
  });
});
