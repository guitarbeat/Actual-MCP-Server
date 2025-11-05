import { describe, it, expect } from 'vitest';
import { ManageTransactionReportGenerator } from './report-generator.js';
import type { ParsedTransactionInput, TransactionOperationResult } from './types.js';

describe('ManageTransactionReportGenerator', () => {
  const generator = new ManageTransactionReportGenerator();

  describe('delete operation', () => {
    it('should format delete message with transaction ID', () => {
      const input: ParsedTransactionInput = {
        operation: 'delete',
        id: 'txn-123',
      };

      const result: TransactionOperationResult = {
        transactionId: 'txn-123',
        operation: 'delete',
      };

      const message = generator.generate(input, result);

      expect(message).toContain('✓ Deleted transaction txn-123');
      expect(message).toContain('⚠️  This operation cannot be undone.');
    });

    it('should include transaction details when available', () => {
      const input: ParsedTransactionInput = {
        operation: 'delete',
        id: 'txn-456',
      };

      const result: TransactionOperationResult = {
        transactionId: 'txn-456',
        operation: 'delete',
        details: {
          date: '2024-01-15',
          amount: -4599,
          payee: 'Amazon',
          account: 'Checking',
        },
      };

      const message = generator.generate(input, result);

      expect(message).toContain('✓ Deleted transaction txn-456');
      expect(message).toContain('Deleted transaction details:');
      expect(message).toContain('• Date: 2024-01-15');
      expect(message).toContain('• Amount: -$45.99');
      expect(message).toContain('• Payee: Amazon');
      expect(message).toContain('• Account: Checking');
      expect(message).toContain('⚠️  This operation cannot be undone.');
    });

    it('should handle partial transaction details', () => {
      const input: ParsedTransactionInput = {
        operation: 'delete',
        id: 'txn-789',
      };

      const result: TransactionOperationResult = {
        transactionId: 'txn-789',
        operation: 'delete',
        details: {
          date: '2024-02-20',
          amount: 10000,
        },
      };

      const message = generator.generate(input, result);

      expect(message).toContain('✓ Deleted transaction txn-789');
      expect(message).toContain('• Date: 2024-02-20');
      expect(message).toContain('• Amount: $100.00');
      expect(message).not.toContain('Payee');
      expect(message).not.toContain('Account');
      expect(message).toContain('⚠️  This operation cannot be undone.');
    });

    it('should format positive amounts correctly', () => {
      const input: ParsedTransactionInput = {
        operation: 'delete',
        id: 'txn-positive',
      };

      const result: TransactionOperationResult = {
        transactionId: 'txn-positive',
        operation: 'delete',
        details: {
          amount: 5000,
        },
      };

      const message = generator.generate(input, result);

      expect(message).toContain('• Amount: $50.00');
    });

    it('should format negative amounts correctly', () => {
      const input: ParsedTransactionInput = {
        operation: 'delete',
        id: 'txn-negative',
      };

      const result: TransactionOperationResult = {
        transactionId: 'txn-negative',
        operation: 'delete',
        details: {
          amount: -7550,
        },
      };

      const message = generator.generate(input, result);

      expect(message).toContain('• Amount: -$75.50');
    });
  });

  describe('create operation', () => {
    it('should format create message successfully', () => {
      const input: ParsedTransactionInput = {
        operation: 'create',
        accountId: 'acc-123',
        date: '2024-01-15',
        amount: -5000,
        payeeId: 'payee-123',
        categoryId: 'cat-123',
      };

      const result: TransactionOperationResult = {
        transactionId: 'txn-new',
        operation: 'create',
      };

      const message = generator.generate(input, result);

      expect(message).toContain('✓ Transaction created successfully');
      expect(message).toContain('Transaction ID: txn-new');
      expect(message).toContain('Date: 2024-01-15');
      expect(message).toContain('Amount: -$50.00');
    });
  });

  describe('update operation', () => {
    it('should format update message successfully', () => {
      const input: ParsedTransactionInput = {
        operation: 'update',
        id: 'txn-existing',
        amount: -7500,
        payeeId: 'payee-456',
      };

      const result: TransactionOperationResult = {
        transactionId: 'txn-existing',
        operation: 'update',
      };

      const message = generator.generate(input, result);

      expect(message).toContain('✓ Transaction updated successfully');
      expect(message).toContain('Transaction ID: txn-existing');
      expect(message).toContain('Updated fields: amount, payee');
    });
  });
});
