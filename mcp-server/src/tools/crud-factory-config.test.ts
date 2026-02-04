import { describe, expect, it } from 'vitest';
import { entityConfigurations } from './crud-factory-config.js';

describe('CRUD Factory Configuration Schemas', () => {
  describe('Category Schemas', () => {
    const { create, update } = entityConfigurations.category;

    it('should fail when category name is too long on create', () => {
      const invalidData = {
        name: 'a'.repeat(101),
        groupId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = create.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Category name must be less than 100 characters');
      }
    });

    it('should fail when category name is too long on update', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'a'.repeat(101),
      };
      const result = update.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Category name must be less than 100 characters');
      }
    });
  });

  describe('Payee Schemas', () => {
    const { create, update } = entityConfigurations.payee;

    it('should fail when payee name is too long on create', () => {
      const invalidData = {
        name: 'a'.repeat(101),
      };
      const result = create.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Payee name must be less than 100 characters');
      }
    });

    it('should fail when payee name is too long on update', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'a'.repeat(101),
      };
      const result = update.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Payee name must be less than 100 characters');
      }
    });
  });

  describe('Account Schemas', () => {
    const { create, update } = entityConfigurations.account;

    it('should fail when account name is too long on create', () => {
      const invalidData = {
        name: 'a'.repeat(101),
        type: 'checking',
      };
      const result = create.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Account name must be less than 100 characters');
      }
    });

    it('should fail when account name is too long on update', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'a'.repeat(101),
      };
      const result = update.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Account name must be less than 100 characters');
      }
    });
  });

  describe('Category Group Schemas', () => {
    const { create, update } = entityConfigurations.categoryGroup;

    it('should fail when category group name is too long on create', () => {
      const invalidData = {
        name: 'a'.repeat(101),
      };
      const result = create.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Category group name must be less than 100 characters');
      }
    });

    it('should fail when category group name is too long on update', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'a'.repeat(101),
      };
      const result = update.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Category group name must be less than 100 characters');
      }
    });
  });

  describe('Rule Schemas', () => {
    // Rule schemas are imported from RuleDataSchema in types.ts, which we modified.
    // We can test entityConfigurations.rule.create.schema
    const { create } = entityConfigurations.rule;

    it('should fail when rule condition value is too long', () => {
      const invalidData = {
        conditionsOp: 'and',
        conditions: [
          {
            field: 'payee',
            op: 'is',
            value: 'a'.repeat(201),
          },
        ],
        actions: [
            {
                field: 'category',
                op: 'set',
                value: '123',
            }
        ]
      };
      const result = create.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
          // Zod error path is deeply nested
          const issue = result.error.issues.find(i => i.message.includes('Condition value must be less than 200 characters'));
          expect(issue).toBeDefined();
      }
    });

    it('should fail when rule action value is too long', () => {
      const invalidData = {
        conditionsOp: 'and',
        conditions: [
          {
            field: 'payee',
            op: 'is',
            value: 'Something',
          },
        ],
        actions: [
            {
                field: 'notes',
                op: 'set',
                value: 'a'.repeat(501),
            }
        ]
      };
      const result = create.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
         const issue = result.error.issues.find(i => i.message.includes('Action value must be less than 500 characters'));
         expect(issue).toBeDefined();
      }
    });
  });
});
