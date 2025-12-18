import type { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it } from 'vitest';
import {
  apiError,
  invalidStringArrayArgument,
  missingBooleanArgument,
  missingMonthArgument,
  missingNumberArgument,
  missingStringArgument,
  missingStringArrayArgument,
  notFoundError,
  permissionError,
  validationError,
} from './error-builder.js';

// Helper to extract text from response
function getPayload(result: CallToolResult): {
  error: boolean;
  message: string;
  suggestion: string;
} {
  const textContent = result.content[0] as TextContent;
  return JSON.parse(textContent.text);
}

describe('Error Builder', () => {
  describe('validationError', () => {
    it('should create a validation error with basic message', () => {
      const result = validationError('Value must be positive');

      expect(result.isError).toBe(true);
      const payload = getPayload(result);
      expect(payload.message).toBe('Value must be positive');
      expect(payload.suggestion).toContain('Review the tool documentation');
    });

    it('should include field name in message', () => {
      const result = validationError('Invalid format', { field: 'accountId' });

      const payload = getPayload(result);
      expect(payload.message).toContain("field 'accountId'");
      expect(payload.message).toContain('Invalid format');
    });

    it('should include received value in message', () => {
      const result = validationError('Invalid type', {
        field: 'amount',
        value: 'abc',
      });

      const payload = getPayload(result);
      expect(payload.message).toContain('"abc"');
    });

    it('should include expected format in message', () => {
      const result = validationError('Invalid format', {
        field: 'date',
        value: '2024-13-01',
        expected: 'YYYY-MM-DD',
      });

      const payload = getPayload(result);
      expect(payload.message).toContain('expected: YYYY-MM-DD');
    });

    it('should suggest valid account types for "type" field', () => {
      const result = validationError('Invalid type', { field: 'type' });
      const payload = getPayload(result);
      expect(payload.suggestion).toContain('restricted values');
      expect(payload.suggestion).toContain('checking, savings, credit');
    });

    it('should suggest valid operators for "op" field', () => {
      const result = validationError('Invalid operator', { field: 'op' });
      const payload = getPayload(result);
      expect(payload.suggestion).toContain('specifies the operator');
      expect(payload.suggestion).toContain('is, contains, gt, lt');
    });

    it('should suggest valid targets for "field" field', () => {
      const result = validationError('Invalid field', { field: 'field' });
      const payload = getPayload(result);
      expect(payload.suggestion).toContain('specifies the target');
      expect(payload.suggestion).toContain('account, category, payee');
    });

    it('should suggest valid methods for "method" field', () => {
      const result = validationError('Invalid method', { field: 'method' });
      const payload = getPayload(result);
      expect(payload.suggestion).toContain('split actions');
      expect(payload.suggestion).toContain('fixed-amount, fixed-percent, remainder');
    });
  });

  describe('notFoundError', () => {
    it('should create a not found error', () => {
      const result = notFoundError('Account', 'acc-123');

      expect(result.isError).toBe(true);
      const payload = getPayload(result);
      expect(payload.message).toBe("Account with ID 'acc-123' not found");
      expect(payload.suggestion).toContain('get-accounts');
    });

    it('should use custom suggestion when provided', () => {
      const result = notFoundError('Category', 'cat-456', {
        suggestion: 'Use get-grouped-categories to find valid category IDs',
      });

      const payload = getPayload(result);
      expect(payload.suggestion).toBe('Use get-grouped-categories to find valid category IDs');
    });

    it('should handle different entity types', () => {
      const result = notFoundError('Payee', 'payee-789');

      const payload = getPayload(result);
      expect(payload.message).toContain('Payee');
      expect(payload.message).toContain('payee-789');
    });
  });

  describe('apiError', () => {
    it('should create an API error from Error object', () => {
      const err = new Error('Connection timeout');
      const result = apiError('Failed to fetch data', err);

      expect(result.isError).toBe(true);
      const payload = getPayload(result);
      expect(payload.message).toContain('Failed to fetch data');
      expect(payload.message).toContain('Connection timeout');
      expect(payload.suggestion).toContain('Actual Budget server');
    });

    it('should include operation name when provided', () => {
      const err = new Error('Invalid response');
      const result = apiError('API call failed', err, {
        operation: 'getTransactions',
      });

      const payload = getPayload(result);
      expect(payload.message).toContain("API operation 'getTransactions' failed");
    });

    it('should include additional context', () => {
      const err = new Error('Not found');
      const result = apiError('Failed', err, {
        operation: 'getAccount',
        accountId: 'acc-123',
      });

      const payload = getPayload(result);
      expect(payload.message).toContain('accountId="acc-123"');
    });

    it('should handle non-Error objects', () => {
      const result = apiError('Request failed', 'Network error');

      const payload = getPayload(result);
      expect(payload.message).toContain('Network error');
    });
  });

  describe('permissionError', () => {
    it('should create a permission error', () => {
      const result = permissionError('create-transaction');

      expect(result.isError).toBe(true);
      const payload = getPayload(result);
      expect(payload.message).toContain("Tool 'create-transaction'");
      expect(payload.message).toContain('Write access not enabled');
      expect(payload.suggestion).toContain('--enable-write');
    });

    it('should use custom reason when provided', () => {
      const result = permissionError('delete-account', {
        reason: 'Insufficient privileges',
      });

      const payload = getPayload(result);
      expect(payload.message).toContain('Insufficient privileges');
    });

    it('should use custom suggestion when provided', () => {
      const result = permissionError('update-budget', {
        suggestion: 'Contact your administrator for write access',
      });

      const payload = getPayload(result);
      expect(payload.suggestion).toBe('Contact your administrator for write access');
    });
  });

  describe('missingStringArgument', () => {
    it('should create an error for missing string argument', () => {
      const result = missingStringArgument('accountId', 'Provide a valid account ID');

      expect(result.isError).toBe(true);
      const payload = getPayload(result);
      expect(payload.message).toBe('accountId is required and must be a string');
      expect(payload.suggestion).toBe('Provide a valid account ID');
    });
  });

  describe('missingNumberArgument', () => {
    it('should create an error for missing number argument', () => {
      const result = missingNumberArgument('amount', 'Provide a numeric amount');

      expect(result.isError).toBe(true);
      const payload = getPayload(result);
      expect(payload.message).toBe('amount is required and must be a number');
      expect(payload.suggestion).toBe('Provide a numeric amount');
    });
  });

  describe('missingBooleanArgument', () => {
    it('should create an error for missing boolean argument', () => {
      const result = missingBooleanArgument('enabled', 'Provide true or false');

      expect(result.isError).toBe(true);
      const payload = getPayload(result);
      expect(payload.message).toBe('enabled is required and must be a boolean');
      expect(payload.suggestion).toBe('Provide true or false');
    });
  });

  describe('missingMonthArgument', () => {
    it('should create an error for missing month argument', () => {
      const result = missingMonthArgument('Use YYYY-MM format');

      expect(result.isError).toBe(true);
      const payload = getPayload(result);
      expect(payload.message).toBe('month is required and must be a string in YYYY-MM format');
      expect(payload.suggestion).toBe('Use YYYY-MM format');
    });
  });

  describe('missingStringArrayArgument', () => {
    it('should create an error for missing string array argument', () => {
      const result = missingStringArrayArgument('accountIds', 'Provide an array of account IDs');

      expect(result.isError).toBe(true);
      const payload = getPayload(result);
      expect(payload.message).toBe('accountIds is required and must be an array of strings');
      expect(payload.suggestion).toBe('Provide an array of account IDs');
    });
  });

  describe('invalidStringArrayArgument', () => {
    it('should create an error for invalid string array values', () => {
      const result = invalidStringArrayArgument('tags', 'All tags must be strings');

      expect(result.isError).toBe(true);
      const payload = getPayload(result);
      expect(payload.message).toBe('All tags must be strings');
      expect(payload.suggestion).toBe('All tags must be strings');
    });
  });
});
