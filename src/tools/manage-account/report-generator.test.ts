import { describe, it, expect } from 'vitest';
import { ManageAccountReportGenerator } from './report-generator.js';
import type { ParsedAccountInput, AccountOperationResult } from './types.js';

describe('ManageAccountReportGenerator', () => {
  const generator = new ManageAccountReportGenerator();

  describe('create message formatting', () => {
    it('should format create message with basic details', () => {
      const input: ParsedAccountInput = {
        operation: 'create',
        name: 'My Checking',
        type: 'checking',
      };

      const result: AccountOperationResult = {
        accountId: 'acc-123',
        operation: 'create',
        details: {
          name: 'My Checking',
          type: 'checking',
        },
      };

      const message = generator.generate(input, result);

      expect(message).toContain('✓ Account created successfully');
      expect(message).toContain('Account ID: acc-123');
      expect(message).toContain('Name: My Checking');
      expect(message).toContain('Type: checking');
    });

    it('should format create message with offbudget flag', () => {
      const input: ParsedAccountInput = {
        operation: 'create',
        name: 'Investment',
        type: 'investment',
      };

      const result: AccountOperationResult = {
        accountId: 'acc-456',
        operation: 'create',
        details: {
          name: 'Investment',
          type: 'investment',
          offbudget: true,
        },
      };

      const message = generator.generate(input, result);

      expect(message).toContain('Off-budget: Yes');
    });

    it('should format create message with offbudget false', () => {
      const input: ParsedAccountInput = {
        operation: 'create',
        name: 'Checking',
        type: 'checking',
      };

      const result: AccountOperationResult = {
        accountId: 'acc-789',
        operation: 'create',
        details: {
          name: 'Checking',
          type: 'checking',
          offbudget: false,
        },
      };

      const message = generator.generate(input, result);

      expect(message).toContain('Off-budget: No');
    });

    it('should format create message with initial balance', () => {
      const input: ParsedAccountInput = {
        operation: 'create',
        name: 'Savings',
        type: 'savings',
        initialBalance: 100000,
      };

      const result: AccountOperationResult = {
        accountId: 'acc-999',
        operation: 'create',
        details: {
          name: 'Savings',
          type: 'savings',
        },
      };

      const message = generator.generate(input, result);

      expect(message).toContain('Initial Balance: $1000.00');
    });

    it('should format negative initial balance', () => {
      const input: ParsedAccountInput = {
        operation: 'create',
        name: 'Credit Card',
        type: 'credit',
        initialBalance: -50000,
      };

      const result: AccountOperationResult = {
        accountId: 'acc-credit',
        operation: 'create',
        details: {
          name: 'Credit Card',
          type: 'credit',
        },
      };

      const message = generator.generate(input, result);

      expect(message).toContain('Initial Balance: -$500.00');
    });
  });

  describe('update message formatting', () => {
    it('should format update message with name change', () => {
      const input: ParsedAccountInput = {
        operation: 'update',
        id: 'acc-123',
        name: 'Updated Name',
      };

      const result: AccountOperationResult = {
        accountId: 'acc-123',
        operation: 'update',
        details: {},
      };

      const message = generator.generate(input, result);

      expect(message).toContain('✓ Account updated successfully');
      expect(message).toContain('Account ID: acc-123');
      expect(message).toContain('Updated fields: name');
    });

    it('should format update message with type change', () => {
      const input: ParsedAccountInput = {
        operation: 'update',
        id: 'acc-456',
        type: 'savings',
      };

      const result: AccountOperationResult = {
        accountId: 'acc-456',
        operation: 'update',
        details: {},
      };

      const message = generator.generate(input, result);

      expect(message).toContain('Updated fields: type');
    });

    it('should format update message with offbudget change', () => {
      const input: ParsedAccountInput = {
        operation: 'update',
        id: 'acc-789',
        offbudget: true,
      };

      const result: AccountOperationResult = {
        accountId: 'acc-789',
        operation: 'update',
        details: {},
      };

      const message = generator.generate(input, result);

      expect(message).toContain('Updated fields: off-budget status');
    });

    it('should format update message with multiple fields', () => {
      const input: ParsedAccountInput = {
        operation: 'update',
        id: 'acc-multi',
        name: 'New Name',
        type: 'credit',
        offbudget: false,
      };

      const result: AccountOperationResult = {
        accountId: 'acc-multi',
        operation: 'update',
        details: {},
      };

      const message = generator.generate(input, result);

      expect(message).toContain('Updated fields: name, type, off-budget status');
    });

    it('should handle update with no fields changed', () => {
      const input: ParsedAccountInput = {
        operation: 'update',
        id: 'acc-none',
      };

      const result: AccountOperationResult = {
        accountId: 'acc-none',
        operation: 'update',
        details: {},
      };

      const message = generator.generate(input, result);

      expect(message).toContain('✓ Account updated successfully');
      expect(message).toContain('Account ID: acc-none');
      expect(message).not.toContain('Updated fields:');
    });
  });

  describe('delete message formatting', () => {
    it('should format delete message with warning', () => {
      const input: ParsedAccountInput = {
        operation: 'delete',
        id: 'acc-123',
      };

      const result: AccountOperationResult = {
        accountId: 'acc-123',
        operation: 'delete',
      };

      const message = generator.generate(input, result);

      expect(message).toContain('✓ Account deleted successfully');
      expect(message).toContain('Account ID: acc-123');
      expect(message).toContain('⚠️  This operation cannot be undone.');
      expect(message).toContain('⚠️  All transactions in this account have been deleted.');
    });

    it('should include all warning messages', () => {
      const input: ParsedAccountInput = {
        operation: 'delete',
        id: 'acc-456',
      };

      const result: AccountOperationResult = {
        accountId: 'acc-456',
        operation: 'delete',
      };

      const message = generator.generate(input, result);

      const warningCount = (message.match(/⚠️/g) || []).length;
      expect(warningCount).toBe(2);
    });
  });

  describe('close message formatting', () => {
    it('should format close message without transfer', () => {
      const input: ParsedAccountInput = {
        operation: 'close',
        id: 'acc-123',
      };

      const result: AccountOperationResult = {
        accountId: 'acc-123',
        operation: 'close',
        details: {
          closed: true,
        },
      };

      const message = generator.generate(input, result);

      expect(message).toContain('✓ Account closed successfully');
      expect(message).toContain('Account ID: acc-123');
      expect(message).toContain('The account is now closed and will not appear in active account lists.');
      expect(message).toContain('You can reopen it later if needed using the "reopen" operation.');
      expect(message).not.toContain('Balance transferred');
    });

    it('should format close message with transfer details', () => {
      const input: ParsedAccountInput = {
        operation: 'close',
        id: 'acc-123',
      };

      const result: AccountOperationResult = {
        accountId: 'acc-123',
        operation: 'close',
        details: {
          closed: true,
          transferredTo: 'acc-456',
        },
      };

      const message = generator.generate(input, result);

      expect(message).toContain('✓ Account closed successfully');
      expect(message).toContain('Balance transferred to account: acc-456');
    });
  });

  describe('reopen message formatting', () => {
    it('should format reopen message', () => {
      const input: ParsedAccountInput = {
        operation: 'reopen',
        id: 'acc-123',
      };

      const result: AccountOperationResult = {
        accountId: 'acc-123',
        operation: 'reopen',
        details: {
          closed: false,
        },
      };

      const message = generator.generate(input, result);

      expect(message).toContain('✓ Account reopened successfully');
      expect(message).toContain('Account ID: acc-123');
      expect(message).toContain('The account is now active and will appear in account lists.');
    });
  });

  describe('balance message formatting', () => {
    it('should format balance message with positive balance', () => {
      const input: ParsedAccountInput = {
        operation: 'balance',
        id: 'acc-123',
      };

      const result: AccountOperationResult = {
        accountId: 'acc-123',
        operation: 'balance',
        balance: 50000,
      };

      const message = generator.generate(input, result);

      expect(message).toContain('Account Balance');
      expect(message).toContain('Account ID: acc-123');
      expect(message).toContain('Balance: $500.00');
    });

    it('should format balance message with negative balance', () => {
      const input: ParsedAccountInput = {
        operation: 'balance',
        id: 'acc-456',
      };

      const result: AccountOperationResult = {
        accountId: 'acc-456',
        operation: 'balance',
        balance: -25000,
      };

      const message = generator.generate(input, result);

      expect(message).toContain('Balance: -$250.00');
    });

    it('should format balance message with zero balance', () => {
      const input: ParsedAccountInput = {
        operation: 'balance',
        id: 'acc-789',
      };

      const result: AccountOperationResult = {
        accountId: 'acc-789',
        operation: 'balance',
        balance: 0,
      };

      const message = generator.generate(input, result);

      expect(message).toContain('Balance: $0.00');
    });

    it('should handle balance with cents', () => {
      const input: ParsedAccountInput = {
        operation: 'balance',
        id: 'acc-cents',
      };

      const result: AccountOperationResult = {
        accountId: 'acc-cents',
        operation: 'balance',
        balance: 12345,
      };

      const message = generator.generate(input, result);

      expect(message).toContain('Balance: $123.45');
    });
  });

  describe('amount formatting', () => {
    it('should format positive amounts correctly', () => {
      const input: ParsedAccountInput = {
        operation: 'create',
        name: 'Test',
        type: 'checking',
        initialBalance: 100,
      };

      const result: AccountOperationResult = {
        accountId: 'acc-test',
        operation: 'create',
        details: {},
      };

      const message = generator.generate(input, result);

      expect(message).toContain('Initial Balance: $1.00');
    });

    it('should format negative amounts correctly', () => {
      const input: ParsedAccountInput = {
        operation: 'create',
        name: 'Test',
        type: 'checking',
        initialBalance: -100,
      };

      const result: AccountOperationResult = {
        accountId: 'acc-test',
        operation: 'create',
        details: {},
      };

      const message = generator.generate(input, result);

      expect(message).toContain('Initial Balance: -$1.00');
    });

    it('should format large amounts correctly', () => {
      const input: ParsedAccountInput = {
        operation: 'create',
        name: 'Test',
        type: 'checking',
        initialBalance: 1234567,
      };

      const result: AccountOperationResult = {
        accountId: 'acc-test',
        operation: 'create',
        details: {},
      };

      const message = generator.generate(input, result);

      expect(message).toContain('Initial Balance: $12345.67');
    });
  });
});
