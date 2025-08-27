// Unit tests for create-transaction report generator

import { describe, it, expect } from 'vitest';
import { CreateTransactionReportGenerator } from './report-generator.js';
import type { CreateTransactionInput, EntityCreationResult } from './types.js';

describe('CreateTransactionReportGenerator', () => {
  const generator = new CreateTransactionReportGenerator();

  describe('generate - happy path', () => {
    it('should generate report for minimal transaction', () => {
      const input: CreateTransactionInput = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: 25.5,
        cleared: true,
      };

      const result: EntityCreationResult & { transactionId: string } = {
        transactionId: 'created',
        createdPayee: false,
        createdCategory: false,
      };

      const report = generator.generate(input, result);

      expect(report).toContain('# Transaction Created Successfully');
      expect(report).toContain('- **Date**: 2023-12-15');
      expect(report).toContain('- **Amount**: $25.50');
      expect(report).toContain('- **Account ID**: account-123');
      expect(report).toContain('- **Status**: Cleared');
      expect(report).toContain('successfully added to your budget');
    });

    it('should generate report for complete transaction with existing entities', () => {
      const input: CreateTransactionInput = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: 25.5,
        payee: 'Grocery Store',
        category: 'Food',
        notes: 'Weekly shopping',
        cleared: false,
      };

      const result: EntityCreationResult & { transactionId: string } = {
        transactionId: 'created',
        payeeId: 'payee-1',
        categoryId: 'cat-1',
        createdPayee: false,
        createdCategory: false,
      };

      const report = generator.generate(input, result);

      expect(report).toContain('- **Payee**: Grocery Store');
      expect(report).toContain('- **Category**: Food');
      expect(report).toContain('- **Notes**: Weekly shopping');
      expect(report).toContain('- **Status**: Pending');
      expect(report).not.toContain('## Entities Created');
      expect(report).not.toContain('newly created');
    });
  });

  describe('generate - entity creation', () => {
    it('should show entity creation when new payee is created', () => {
      const input: CreateTransactionInput = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: 25.5,
        payee: 'New Restaurant',
        cleared: true,
      };

      const result: EntityCreationResult & { transactionId: string } = {
        transactionId: 'created',
        payeeId: 'payee-new',
        createdPayee: true,
        createdCategory: false,
      };

      const report = generator.generate(input, result);

      expect(report).toContain('- **Payee**: New Restaurant *(newly created)*');
      expect(report).toContain('## Entities Created');
      expect(report).toContain('- ✓ Created new payee: **New Restaurant**');
    });

    it('should show entity creation when new category is created', () => {
      const input: CreateTransactionInput = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: 25.5,
        category: 'New Category',
        cleared: true,
      };

      const result: EntityCreationResult & { transactionId: string } = {
        transactionId: 'created',
        categoryId: 'cat-new',
        createdPayee: false,
        createdCategory: true,
      };

      const report = generator.generate(input, result);

      expect(report).toContain('- **Category**: New Category *(newly created)*');
      expect(report).toContain('## Entities Created');
      expect(report).toContain('- ✓ Created new category: **New Category**');
    });

    it('should show both entity creations when both are new', () => {
      const input: CreateTransactionInput = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: 25.5,
        payee: 'New Store',
        categoryGroup: 'New Group',
        cleared: true,
      };

      const result: EntityCreationResult & { transactionId: string } = {
        transactionId: 'created',
        payeeId: 'payee-new',
        categoryId: 'cat-new',
        createdPayee: true,
        createdCategory: true,
      };

      const report = generator.generate(input, result);

      expect(report).toContain('- **Payee**: New Store *(newly created)*');
      expect(report).toContain('- **Category**: New Group *(newly created)*');
      expect(report).toContain('## Entities Created');
      expect(report).toContain('- ✓ Created new payee: **New Store**');
      expect(report).toContain('- ✓ Created new category: **New Group**');
    });
  });

  describe('generate - edge cases', () => {
    it('should handle negative amounts correctly', () => {
      const input: CreateTransactionInput = {
        accountId: 'account-123',
        date: '2023-12-15',
        amount: -50.0,
        cleared: true,
      };

      const result: EntityCreationResult & { transactionId: string } = {
        transactionId: 'created',
        createdPayee: false,
        createdCategory: false,
      };

      const report = generator.generate(input, result);

      expect(report).toContain('- **Amount**: -$50.00');
    });
  });
});
