import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockApi = vi.hoisted(() => ({
  getBudgetMonths: vi.fn(),
  getBudgetMonth: vi.fn(),
}));

vi.mock('../../../actual-api.js', () => mockApi);

describe('get-budget tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list months (no month parameter)', () => {
    it('should return list of available months', async () => {
      const mockMonths = ['2024-01', '2024-02', '2024-03'];
      mockApi.getBudgetMonths.mockResolvedValue(mockMonths);

      const response = await handler({});

      expect(mockApi.getBudgetMonths).toHaveBeenCalled();
      expect(mockApi.getBudgetMonth).not.toHaveBeenCalled();
      expect(response.isError).toBeUndefined();
      expect(response.content).toBeDefined();
      const data = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(data).toEqual(mockMonths);
    });

    it('should handle empty months list', async () => {
      mockApi.getBudgetMonths.mockResolvedValue([]);

      const response = await handler({});

      expect(response.isError).toBeUndefined();
      const data = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(data).toEqual([]);
    });

    it('should handle API errors when listing months', async () => {
      mockApi.getBudgetMonths.mockRejectedValue(new Error('API error'));

      const response = await handler({});

      expect(response.isError).toBe(true);
    });
  });

  describe('get specific month budget', () => {
    it('should return budget data for specific month', async () => {
      const mockBudget = {
        month: '2024-01',
        categories: [{ id: 'cat1', name: 'Groceries', budgeted: 50000, spent: 45000 }],
      };
      mockApi.getBudgetMonth.mockResolvedValue(mockBudget);

      const response = await handler({ month: '2024-01' });

      expect(mockApi.getBudgetMonth).toHaveBeenCalledWith('2024-01');
      expect(mockApi.getBudgetMonths).not.toHaveBeenCalled();
      expect(response.isError).toBeUndefined();
      const data = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(data).toEqual(mockBudget);
    });

    it('should handle invalid month format (non-string)', async () => {
      const response = await handler({ month: 202401 });

      expect(response.isError).toBe(true);
      expect(mockApi.getBudgetMonth).not.toHaveBeenCalled();
      expect(mockApi.getBudgetMonths).not.toHaveBeenCalled();
    });

    it('should reject invalid month format (not YYYY-MM)', async () => {
      const response = await handler({ month: 'invalid-month' });

      expect(response.isError).toBe(true);
      expect(mockApi.getBudgetMonth).not.toHaveBeenCalled();
      const errorData = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(errorData.message).toContain('Invalid month format');
    });

    it('should reject invalid month number (2025-13)', async () => {
      const response = await handler({ month: '2025-13' });

      expect(response.isError).toBe(true);
      expect(mockApi.getBudgetMonth).not.toHaveBeenCalled();
      const errorData = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(errorData.message).toContain('Invalid month');
    });

    it('should reject invalid year (too old)', async () => {
      const response = await handler({ month: '1899-01' });

      expect(response.isError).toBe(true);
      expect(mockApi.getBudgetMonth).not.toHaveBeenCalled();
      const errorData = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(errorData.message).toContain('Invalid year');
    });

    it('should reject invalid year (too far in future)', async () => {
      const response = await handler({ month: '2101-01' });

      expect(response.isError).toBe(true);
      expect(mockApi.getBudgetMonth).not.toHaveBeenCalled();
      const errorData = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(errorData.message).toContain('Invalid year');
    });

    it('should handle API errors when getting month budget', async () => {
      mockApi.getBudgetMonth.mockRejectedValue(new Error('Month not found'));

      const response = await handler({ month: '2024-12' });

      expect(response.isError).toBe(true);
    });
  });
});
