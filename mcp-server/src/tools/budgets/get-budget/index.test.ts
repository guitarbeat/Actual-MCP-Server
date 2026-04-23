import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler, validateMonthFormat } from './index.js';
import { getBudgetMonth, getBudgetMonths } from '../../../core/api/actual-client.js';

vi.mock('../../../core/api/actual-client.js', () => ({
  getBudgetMonth: vi.fn(),
  getBudgetMonths: vi.fn(),
}));

function parseJsonResponse(response: any): Record<string, unknown> {
  const firstContent = response.content[0];
  if (!('text' in firstContent)) {
    throw new Error('Expected text content');
  }
  return JSON.parse(firstContent.text) as Record<string, unknown>;
}

describe('get-budget-month tool', () => {
  describe('validateMonthFormat', () => {
    it('should pass for valid YYYY-MM format', () => {
      expect(() => validateMonthFormat('2024-01')).not.toThrow();
      expect(() => validateMonthFormat('2100-12')).not.toThrow();
      expect(() => validateMonthFormat('1900-01')).not.toThrow();
    });

    it('should throw for invalid format regex', () => {
      expect(() => validateMonthFormat('2024-1')).toThrow('Invalid month format');
      expect(() => validateMonthFormat('24-01')).toThrow('Invalid month format');
      expect(() => validateMonthFormat('abc')).toThrow('Invalid month format');
      expect(() => validateMonthFormat('2024/01')).toThrow('Invalid month format');
    });

    it('should throw for year out of range', () => {
      expect(() => validateMonthFormat('1899-12')).toThrow('Invalid year');
      expect(() => validateMonthFormat('2101-01')).toThrow('Invalid year');
    });

    it('should throw for month out of range', () => {
      expect(() => validateMonthFormat('2024-00')).toThrow('Invalid month');
      expect(() => validateMonthFormat('2024-13')).toThrow('Invalid month');
    });
  });

  describe('handler', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return budget for a valid month', async () => {
      const mockBudget = { month: '2024-01', categories: [] };
      vi.mocked(getBudgetMonth).mockResolvedValue(mockBudget);

      const response = await handler({ month: '2024-01' });
      const payload = parseJsonResponse(response);

      expect(getBudgetMonth).toHaveBeenCalledWith('2024-01');
      expect(payload).toEqual(mockBudget);
      expect(response.isError).toBeUndefined();
    });

    it('should return available months if month is omitted', async () => {
      const mockMonths = ['2024-01', '2024-02'];
      vi.mocked(getBudgetMonths).mockResolvedValue(mockMonths);

      const response = await handler({});
      const payload = parseJsonResponse(response);

      expect(getBudgetMonths).toHaveBeenCalled();
      expect(payload).toEqual(mockMonths);
      expect(response.isError).toBeUndefined();
    });

    it('should return error if month is not a string', async () => {
      const response = await handler({ month: 123 });
      const payload = parseJsonResponse(response);

      expect(response.isError).toBe(true);
      expect(payload.message).toContain('month must be a string');
    });

    it('should return error if month fails validation', async () => {
      const response = await handler({ month: 'invalid' });
      const payload = parseJsonResponse(response);

      expect(response.isError).toBe(true);
      expect(payload.message).toContain('Invalid month format');
    });

    it('should handle "not found" API error specifically', async () => {
      vi.mocked(getBudgetMonth).mockRejectedValue(new Error('Budget not found'));

      const response = await handler({ month: '2024-01' });
      const payload = parseJsonResponse(response);

      expect(response.isError).toBe(true);
      expect(payload.message).toContain('Budget data not found for month 2024-01');
    });

    it('should handle generic API errors', async () => {
      vi.mocked(getBudgetMonth).mockRejectedValue(new Error('Some API error'));

      const response = await handler({ month: '2024-01' });
      const payload = parseJsonResponse(response);

      expect(response.isError).toBe(true);
      expect(payload.message).toContain('Failed to retrieve budget data');
    });
  });
});
