import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as actualApi from '../../../actual-api.js';
import { RuleHandler } from './rule-handler.js';

vi.mock('../../../actual-api.js');

describe('RuleHandler', () => {
  let ruleHandler: RuleHandler;

  beforeEach(() => {
    ruleHandler = new RuleHandler();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a rule with valid data', async () => {
      const data = {
        conditions: [{ field: 'payee' as const, op: 'is' as const, value: 'test' }],
        actions: [{ field: 'category' as const, op: 'set' as const, value: 'test' }],
        conditionsOp: 'and' as const,
      };
      const expectedId = 'new-rule-id';
      vi.mocked(actualApi.createRule).mockResolvedValue({
        id: expectedId,
        ...data,
        stage: null,
      } as any);

      const result = await ruleHandler.create(data);

      expect(actualApi.createRule).toHaveBeenCalledWith(data);
      expect(result).toBe(expectedId);
    });
  });

  describe('update', () => {
    it('should update a rule with valid data', async () => {
      const id = 'rule-1';
      const data = {
        conditions: [{ field: 'payee' as const, op: 'is' as const, value: 'test' }],
        actions: [{ field: 'category' as const, op: 'set' as const, value: 'test' }],
        conditionsOp: 'and' as const,
      };
      vi.mocked(actualApi.updateRule).mockResolvedValue({
        id,
        ...data,
        stage: null,
      } as any);

      await ruleHandler.update(id, data);

      expect(actualApi.updateRule).toHaveBeenCalledWith({ id, ...data });
    });
  });

  describe('delete', () => {
    it('should delete a rule by id', async () => {
      const id = 'rule-1';
      vi.mocked(actualApi.deleteRule).mockResolvedValue(true);

      await ruleHandler.delete(id);

      expect(actualApi.deleteRule).toHaveBeenCalledWith(id);
    });
  });

  describe('validate', () => {
    it('should throw an error if id is missing for update', () => {
      expect(() => ruleHandler.validate('update', undefined, {})).toThrow();
    });

    it('should throw an error if id is missing for delete', () => {
      expect(() => ruleHandler.validate('delete', undefined)).toThrow();
    });

    it('should throw an error if data is missing for create', () => {
      expect(() => ruleHandler.validate('create')).toThrow();
    });

    it('should throw an error if data is missing for update', () => {
      expect(() => ruleHandler.validate('update', 'some-id', undefined)).toThrow();
    });
  });
});
