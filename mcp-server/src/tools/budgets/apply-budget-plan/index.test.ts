import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockSetBudgetAmount = vi.fn();
const mockResolveCategory = vi.fn();

vi.mock('../../../core/api/actual-client.js', () => ({
  setBudgetAmount: (...args: unknown[]) => mockSetBudgetAmount(...args),
}));

vi.mock('../../../core/utils/name-resolver.js', () => ({
  nameResolver: {
    resolveCategory: (...args: unknown[]) => mockResolveCategory(...args),
  },
}));

function parseJsonResponse(response: Awaited<ReturnType<typeof handler>>): Record<string, unknown> {
  const firstContent = response.content[0];

  if (!('text' in firstContent)) {
    throw new Error('Expected text content');
  }

  return JSON.parse(firstContent.text) as Record<string, unknown>;
}

describe('apply-budget-plan handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies direct and resolved category recommendations', async () => {
    mockResolveCategory.mockResolvedValue('cat-groceries');
    mockSetBudgetAmount.mockResolvedValue(undefined);

    const response = await handler({
      month: '2025-04',
      recommendations: [
        { categoryId: 'cat-rent', categoryName: 'Rent', amount: 120000 },
        { category: 'Groceries', categoryName: 'Groceries', amount: 45000 },
      ],
    });
    const payload = parseJsonResponse(response);

    expect(mockSetBudgetAmount).toHaveBeenCalledTimes(2);
    expect(payload.applied).toEqual([
      { categoryId: 'cat-rent', categoryName: 'Rent', amount: 120000 },
      { categoryId: 'cat-groceries', categoryName: 'Groceries', amount: 45000 },
    ]);
  });

  it('reports skipped zero-value recommendations and partial failures', async () => {
    mockResolveCategory.mockImplementation(async (category: string) => {
      if (category === 'Broken Category') {
        throw new Error('Category lookup failed');
      }

      return 'cat-groceries';
    });
    mockSetBudgetAmount.mockResolvedValue(undefined);

    const response = await handler({
      month: '2025-04',
      recommendations: [
        { category: 'Zero Category', categoryName: 'Zero Category', amount: 0 },
        { category: 'Broken Category', categoryName: 'Broken Category', amount: 45000 },
      ],
    });
    const payload = parseJsonResponse(response);

    expect(payload.skipped).toEqual([
      {
        categoryName: 'Zero Category',
        reason: 'Recommendation amount is zero.',
      },
    ]);
    expect(payload.failed).toEqual([
      {
        categoryName: 'Broken Category',
        error: 'Category lookup failed',
      },
    ]);
  });

  it('returns a validation error when the request is malformed', async () => {
    const response = await handler({
      month: '2025/04',
      recommendations: [],
    });
    const payload = parseJsonResponse(response);

    expect(response.isError).toBe(true);
    expect(payload.message).toContain('Validation error');
  });
});
