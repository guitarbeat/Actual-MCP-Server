import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './index.js';
import { setBudgetCarryover } from '../../../actual-api.js';

vi.mock('../../../actual-api.js', () => ({
  setBudgetCarryover: vi.fn(),
}));

describe('set-budget-carryover handler', () => {
  const validMonth = '2024-02';
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calls API with validated inputs', async () => {
    const setBudgetCarryoverMock = vi.mocked(setBudgetCarryover);
    setBudgetCarryoverMock.mockResolvedValue(undefined);

    const result = await handler({ month: validMonth, categoryId: validUuid, enabled: true });

    expect(setBudgetCarryover).toHaveBeenCalledWith(validMonth, validUuid, true);
    expect(result.isError).toBeUndefined();
  });

  it('rejects invalid month formats', async () => {
    const result = await handler({ month: '02-2024', categoryId: validUuid, enabled: true });

    expect(setBudgetCarryover).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content?.[0]).toEqual({ type: 'text', text: 'Error: month must be in YYYY-MM format' });
  });

  it('rejects invalid category identifiers', async () => {
    const result = await handler({ month: validMonth, categoryId: 'not-a-uuid', enabled: true });

    expect(setBudgetCarryover).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content?.[0]).toEqual({ type: 'text', text: 'Error: categoryId must be a valid UUID' });
  });
});
