import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockData = vi.hoisted(() => ({
  fetchAllPayees: vi.fn(),
}));

const mockApi = vi.hoisted(() => ({
  getPayeeRules: vi.fn(),
}));

vi.mock('../../../core/data/fetch-payees.js', () => mockData);
vi.mock('../../../actual-api.js', () => mockApi);

describe('get-payees tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get all payees (no payeeId)', () => {
    it('should return all payees', async () => {
      const mockPayees = [
        { id: 'payee-1', name: 'Amazon', transfer_acct: null },
        { id: 'payee-2', name: 'Grocery Store', transfer_acct: 'acc-123' },
        { id: 'payee-3', name: 'Transfer', transfer_acct: 'acc-456' },
      ];
      mockData.fetchAllPayees.mockResolvedValue(mockPayees);

      const response = await handler({});

      expect(mockData.fetchAllPayees).toHaveBeenCalled();
      expect(mockApi.getPayeeRules).not.toHaveBeenCalled();
      expect(response.isError).toBeUndefined();
      const data = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(data).toHaveLength(3);
      expect(data[0]).toEqual({ id: 'payee-1', name: 'Amazon', transfer_acct: '(not a transfer payee)' });
      expect(data[1]).toEqual({ id: 'payee-2', name: 'Grocery Store', transfer_acct: 'acc-123' });
      expect(data[2]).toEqual({ id: 'payee-3', name: 'Transfer', transfer_acct: 'acc-456' });
    });

    it('should filter payees by search term', async () => {
      const mockPayees = [
        { id: 'payee-1', name: 'Amazon', transfer_acct: null },
        { id: 'payee-2', name: 'Amazon Prime', transfer_acct: null },
        { id: 'payee-3', name: 'Grocery Store', transfer_acct: null },
      ];
      mockData.fetchAllPayees.mockResolvedValue(mockPayees);

      const response = await handler({ search: 'amazon' });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe('Amazon');
      expect(data[1].name).toBe('Amazon Prime');
    });

    it('should apply limit to results', async () => {
      const mockPayees = [
        { id: 'payee-1', name: 'Payee 1', transfer_acct: null },
        { id: 'payee-2', name: 'Payee 2', transfer_acct: null },
        { id: 'payee-3', name: 'Payee 3', transfer_acct: null },
      ];
      mockData.fetchAllPayees.mockResolvedValue(mockPayees);

      const response = await handler({ limit: 2 });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(data).toHaveLength(2);
    });

    it('should apply search and limit together', async () => {
      const mockPayees = [
        { id: 'payee-1', name: 'Amazon', transfer_acct: null },
        { id: 'payee-2', name: 'Amazon Prime', transfer_acct: null },
        { id: 'payee-3', name: 'Amazon Fresh', transfer_acct: null },
      ];
      mockData.fetchAllPayees.mockResolvedValue(mockPayees);

      const response = await handler({ search: 'amazon', limit: 2 });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(data).toHaveLength(2);
      expect(data.every((p: { name: string }) => p.name.toLowerCase().includes('amazon'))).toBe(true);
    });

    it('should reject invalid search type', async () => {
      const response = await handler({ search: 123 });

      expect(response.isError).toBe(true);
      expect(mockData.fetchAllPayees).not.toHaveBeenCalled();
    });

    it('should reject invalid limit (not a number)', async () => {
      const response = await handler({ limit: 'invalid' });

      expect(response.isError).toBe(true);
    });

    it('should reject invalid limit (less than 1)', async () => {
      const response = await handler({ limit: 0 });

      expect(response.isError).toBe(true);
    });

    it('should handle empty payees list', async () => {
      mockData.fetchAllPayees.mockResolvedValue([]);

      const response = await handler({});

      expect(response.isError).toBeUndefined();
      const data = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(data).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockData.fetchAllPayees.mockRejectedValue(new Error('API error'));

      const response = await handler({});

      expect(response.isError).toBe(true);
    });
  });

  describe('get payee rules (with payeeId)', () => {
    it('should return rules for specific payee', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          conditionsOp: 'and',
          conditions: [{ field: 'payee', op: 'is', value: 'payee-123' }],
          actions: [{ field: 'category', op: 'set', value: 'cat-456' }],
        },
      ];
      mockApi.getPayeeRules.mockResolvedValue(mockRules);

      const response = await handler({ payeeId: 'payee-123' });

      expect(mockApi.getPayeeRules).toHaveBeenCalledWith('payee-123');
      expect(mockData.fetchAllPayees).not.toHaveBeenCalled();
      expect(response.isError).toBeUndefined();
      const data = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(data).toEqual(mockRules);
    });

    it('should return empty rules array when payee has no rules', async () => {
      mockApi.getPayeeRules.mockResolvedValue([]);

      const response = await handler({ payeeId: 'payee-123' });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(data).toEqual([]);
    });

    it('should return error when payeeId is not a string', async () => {
      const response = await handler({ payeeId: 123 });

      expect(response.isError).toBe(true);
      expect(mockApi.getPayeeRules).not.toHaveBeenCalled();
    });

    it('should handle API errors when getting rules', async () => {
      mockApi.getPayeeRules.mockRejectedValue(new Error('Payee not found'));

      const response = await handler({ payeeId: 'invalid-payee' });

      expect(response.isError).toBe(true);
    });
  });
});
