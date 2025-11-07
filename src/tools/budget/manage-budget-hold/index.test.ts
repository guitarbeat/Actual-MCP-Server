import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockApi = vi.hoisted(() => ({
  holdBudgetForNextMonth: vi.fn(),
  resetBudgetHold: vi.fn(),
}));

vi.mock('../../../actual-api.js', () => mockApi);

describe('manage-budget-hold tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hold operation', () => {
    it('should hold budget amount for next month', async () => {
      mockApi.holdBudgetForNextMonth.mockResolvedValue(undefined);

      const response = await handler({
        operation: 'hold',
        month: '2024-01',
        amount: 50000,
      });

      expect(mockApi.holdBudgetForNextMonth).toHaveBeenCalledWith('2024-01', 50000);
      expect(mockApi.resetBudgetHold).not.toHaveBeenCalled();
      expect(response.isError).toBeUndefined();
      const data = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(data).toContain('Successfully held budget amount');
      expect(data).toContain('50000');
      expect(data).toContain('2024-01');
    });

    it('should return error when amount is missing', async () => {
      const response = await handler({
        operation: 'hold',
        month: '2024-01',
      });

      expect(response.isError).toBe(true);
      expect(mockApi.holdBudgetForNextMonth).not.toHaveBeenCalled();
    });

    it('should return error when amount is not a number', async () => {
      const response = await handler({
        operation: 'hold',
        month: '2024-01',
        amount: '50000',
      });

      expect(response.isError).toBe(true);
      expect(mockApi.holdBudgetForNextMonth).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      mockApi.holdBudgetForNextMonth.mockRejectedValue(new Error('API error'));

      const response = await handler({
        operation: 'hold',
        month: '2024-01',
        amount: 50000,
      });

      expect(response.isError).toBe(true);
    });
  });

  describe('reset operation', () => {
    it('should reset budget hold for month', async () => {
      mockApi.resetBudgetHold.mockResolvedValue(undefined);

      const response = await handler({
        operation: 'reset',
        month: '2024-01',
      });

      expect(mockApi.resetBudgetHold).toHaveBeenCalledWith('2024-01');
      expect(mockApi.holdBudgetForNextMonth).not.toHaveBeenCalled();
      expect(response.isError).toBeUndefined();
      const data = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(data).toContain('Successfully reset budget hold');
      expect(data).toContain('2024-01');
    });

    it('should handle API errors', async () => {
      mockApi.resetBudgetHold.mockRejectedValue(new Error('API error'));

      const response = await handler({
        operation: 'reset',
        month: '2024-01',
      });

      expect(response.isError).toBe(true);
    });
  });

  describe('validation errors', () => {
    it('should return error when operation is missing', async () => {
      const response = await handler({
        month: '2024-01',
      });

      expect(response.isError).toBe(true);
      expect(mockApi.holdBudgetForNextMonth).not.toHaveBeenCalled();
      expect(mockApi.resetBudgetHold).not.toHaveBeenCalled();
    });

    it('should return error when operation is invalid', async () => {
      const response = await handler({
        operation: 'invalid',
        month: '2024-01',
      });

      expect(response.isError).toBe(true);
      expect(mockApi.holdBudgetForNextMonth).not.toHaveBeenCalled();
      expect(mockApi.resetBudgetHold).not.toHaveBeenCalled();
    });

    it('should return error when month is missing', async () => {
      const response = await handler({
        operation: 'hold',
        amount: 50000,
      });

      expect(response.isError).toBe(true);
      expect(mockApi.holdBudgetForNextMonth).not.toHaveBeenCalled();
    });

    it('should return error when month is not a string', async () => {
      const response = await handler({
        operation: 'hold',
        month: 202401,
        amount: 50000,
      });

      expect(response.isError).toBe(true);
      expect(mockApi.holdBudgetForNextMonth).not.toHaveBeenCalled();
    });
  });
});
