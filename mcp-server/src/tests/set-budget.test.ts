import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from '../tools/set-budget/index.js';
import * as actualClient from '../core/api/actual-client.js';
import { nameResolver } from '../core/utils/name-resolver.js';

// Mock the dependencies
vi.mock('../core/api/actual-client.js', () => ({
  setBudgetAmount: vi.fn().mockResolvedValue(undefined),
  setBudgetCarryover: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../core/utils/name-resolver.js', () => ({
  nameResolver: {
    resolveCategory: vi.fn().mockResolvedValue('cat_123'),
  },
}));

describe('set-budget tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have the correct name and required properties', () => {
      expect(schema.name).toBe('set-budget');
      expect(schema.inputSchema.required).toContain('month');
      expect(schema.inputSchema.required).toContain('category');
    });
  });

  describe('handler', () => {
    it('should correctly set budget amount', async () => {
      const args = {
        month: '2024-01',
        category: 'Groceries',
        amount: 500, // This will be treated as dollars and converted to 50000 cents
      };

      const result = await handler(args);

      expect(nameResolver.resolveCategory).toHaveBeenCalledWith('Groceries');
      expect(actualClient.setBudgetAmount).toHaveBeenCalledWith('2024-01', 'cat_123', 50000);
      expect(actualClient.setBudgetCarryover).not.toHaveBeenCalled();

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Successfully updated budget for category');
      expect(result.content[0].text).toContain('amount set to $500.00');
    });

    it('should correctly set budget carryover', async () => {
      const args = {
        month: '2024-01',
        category: 'Groceries',
        carryover: true,
      };

      const result = await handler(args);

      expect(nameResolver.resolveCategory).toHaveBeenCalledWith('Groceries');
      expect(actualClient.setBudgetAmount).not.toHaveBeenCalled();
      expect(actualClient.setBudgetCarryover).toHaveBeenCalledWith('2024-01', 'cat_123', true);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('carryover enabled');
    });

    it('should set both amount and carryover when provided', async () => {
      const args = {
        month: '2024-01',
        category: 'Groceries',
        amount: 1500, // cents
        carryover: false,
      };

      const result = await handler(args);

      expect(actualClient.setBudgetAmount).toHaveBeenCalledWith('2024-01', 'cat_123', 1500);
      expect(actualClient.setBudgetCarryover).toHaveBeenCalledWith('2024-01', 'cat_123', false);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('amount set to $15.00');
      expect(result.content[0].text).toContain('carryover disabled');
    });

    it('should reject invalid month format', async () => {
      const args = {
        month: '2024/01', // Invalid format
        category: 'Groceries',
        amount: 500,
      };

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Month must be in YYYY-MM format');
      expect(actualClient.setBudgetAmount).not.toHaveBeenCalled();
    });

    it('should reject when neither amount nor carryover is provided', async () => {
      const args = {
        month: '2024-01',
        category: 'Groceries',
      };

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('At least one of amount or carryover must be provided');
      expect(actualClient.setBudgetAmount).not.toHaveBeenCalled();
      expect(actualClient.setBudgetCarryover).not.toHaveBeenCalled();
    });

    it('should handle missing categories gracefully', async () => {
      // Mock nameResolver to throw an error
      vi.mocked(nameResolver.resolveCategory).mockRejectedValueOnce(
        new Error('Category not found')
      );

      const args = {
        month: '2024-01',
        category: 'NonexistentCategory',
        amount: 500,
      };

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Category not found');
      expect(actualClient.setBudgetAmount).not.toHaveBeenCalled();
    });
  });
});
