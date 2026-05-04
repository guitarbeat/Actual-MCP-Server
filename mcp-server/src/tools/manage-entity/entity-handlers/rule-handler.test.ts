import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RuleHandler } from './rule-handler.js';

const mockCreateRule = vi.fn();
const mockUpdateRule = vi.fn();
const mockDeleteRule = vi.fn();

vi.mock('../../../core/api/actual-client.js', () => ({
  createRule: (...args: unknown[]) => mockCreateRule(...args),
  updateRule: (...args: unknown[]) => mockUpdateRule(...args),
  deleteRule: (...args: unknown[]) => mockDeleteRule(...args),
}));

const validRuleData = {
  conditionsOp: 'and' as const,
  conditions: [{ field: 'payee' as const, op: 'is' as const, value: 'Amazon' }],
  actions: [{ field: 'category' as const, op: 'set' as const, value: 'cat-1' }],
};

describe('RuleHandler', () => {
  let handler: RuleHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new RuleHandler();
    mockCreateRule.mockResolvedValue({ id: 'rule-new' });
    mockUpdateRule.mockResolvedValue(undefined);
    mockDeleteRule.mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('calls createRule with validated data and returns the id', async () => {
      const id = await handler.create(validRuleData);
      expect(mockCreateRule).toHaveBeenCalledWith(validRuleData);
      expect(id).toBe('rule-new');
    });

    it('throws when conditions array is empty', async () => {
      await expect(handler.create({ ...validRuleData, conditions: [] })).rejects.toThrow();
    });

    it('throws when actions array is empty', async () => {
      await expect(handler.create({ ...validRuleData, actions: [] })).rejects.toThrow();
    });

    it('accepts optional stage field', async () => {
      await handler.create({ ...validRuleData, stage: 'pre' });
      expect(mockCreateRule).toHaveBeenCalledWith(expect.objectContaining({ stage: 'pre' }));
    });
  });

  describe('update', () => {
    it('calls updateRule with id merged into partial data', async () => {
      await handler.update('rule-1', {
        conditionsOp: 'or',
        conditions: validRuleData.conditions,
        actions: validRuleData.actions,
      });
      expect(mockUpdateRule).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rule-1', conditionsOp: 'or' }),
      );
    });

    it('supports partial update (empty object)', async () => {
      await handler.update('rule-1', {});
      expect(mockUpdateRule).toHaveBeenCalledWith(expect.objectContaining({ id: 'rule-1' }));
    });
  });

  describe('delete', () => {
    it('calls deleteRule with id', async () => {
      await handler.delete('rule-1');
      expect(mockDeleteRule).toHaveBeenCalledWith('rule-1');
    });
  });

  describe('validate', () => {
    it('does not throw for create with data', () => {
      expect(() => handler.validate('create', undefined, validRuleData)).not.toThrow();
    });

    it('throws when id is missing for update', () => {
      expect(() => handler.validate('update', undefined, validRuleData)).toThrow();
    });

    it('throws when data is missing for create', () => {
      expect(() => handler.validate('create', undefined, undefined)).toThrow();
    });

    it('does not throw for delete with only id', () => {
      expect(() => handler.validate('delete', 'rule-1', undefined)).not.toThrow();
    });
  });

  describe('invalidateCache', () => {
    it('does not throw (rules are not cached)', () => {
      expect(() => handler.invalidateCache()).not.toThrow();
    });
  });
});
