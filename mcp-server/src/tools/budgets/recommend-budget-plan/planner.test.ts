import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recommendBudgetPlan } from './planner.js';

const mockGetBudgetMonth = vi.fn();
const mockFetchAllCategories = vi.fn();
const mockFetchAllCategoryGroupsMap = vi.fn();

vi.mock('../../../core/api/actual-client.js', () => ({
  getBudgetMonth: (...args: unknown[]) => mockGetBudgetMonth(...args),
}));

vi.mock('../../../core/data/index.js', () => ({
  fetchAllCategories: () => mockFetchAllCategories(),
  fetchAllCategoryGroupsMap: () => mockFetchAllCategoryGroupsMap(),
}));

describe('recommendBudgetPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recommends fixed and average category budgets from recent history', async () => {
    mockFetchAllCategories.mockResolvedValue([
      { id: 'cat-rent', name: 'Rent', group_id: 'group-housing' },
      { id: 'cat-groceries', name: 'Groceries', group_id: 'group-living' },
    ]);
    mockFetchAllCategoryGroupsMap.mockResolvedValue({
      'group-housing': { name: 'Housing' },
      'group-living': { name: 'Living' },
    });
    mockGetBudgetMonth.mockImplementation(async (month: string) => {
      const spentByMonth: Record<string, [number, number]> = {
        '2025-01': [-100000, -12345],
        '2025-02': [-100000, -22222],
        '2025-03': [-100000, -11000],
      };
      const [rentSpent, groceriesSpent] = spentByMonth[month];

      return {
        categoryGroups: [
          {
            name: 'Housing',
            categories: [{ id: 'cat-rent', name: 'Rent', spent: rentSpent }],
          },
          {
            name: 'Living',
            categories: [{ id: 'cat-groceries', name: 'Groceries', spent: groceriesSpent }],
          },
        ],
      };
    });

    const result = await recommendBudgetPlan({
      month: '2025-04',
      lookbackMonths: 3,
      roundingIncrement: 1000,
      minimumFloor: 5000,
    });

    expect(result.monthsAnalyzed).toEqual(['2025-01', '2025-02', '2025-03']);
    expect(result.recommendations.slice(0, 2)).toEqual([
      expect.objectContaining({
        categoryId: 'cat-rent',
        method: 'fixed',
        recommendedAmount: 100000,
      }),
      expect.objectContaining({
        categoryId: 'cat-groceries',
        method: 'average',
        recommendedAmount: 16000,
      }),
    ]);
    expect(result.totals.recommendedAmount).toBe(116000);
    expect(result.warnings).toEqual([]);
  });

  it('reports warnings for missing months and unresolved budget categories', async () => {
    mockFetchAllCategories.mockResolvedValue([
      { id: 'cat-rent', name: 'Rent', group_id: 'group-housing' },
    ]);
    mockFetchAllCategoryGroupsMap.mockResolvedValue({
      'group-housing': { name: 'Housing' },
    });
    mockGetBudgetMonth
      .mockRejectedValueOnce(new Error('Budget download failed'))
      .mockResolvedValueOnce({
        categoryGroups: [
          {
            name: 'Housing',
            categories: [{ name: 'Unknown Category', spent: -5000 }],
          },
        ],
      });

    const result = await recommendBudgetPlan({
      month: '2025-03',
      lookbackMonths: 2,
      roundingIncrement: 1000,
      minimumFloor: 5000,
    });

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Unable to load budget data for 2025-01: Budget download failed'),
        expect.stringContaining("Skipped category 'Unknown Category' in group 'Housing'"),
      ]),
    );
  });

  it('fails when there are no expense categories to analyze', async () => {
    mockFetchAllCategories.mockResolvedValue([]);
    mockFetchAllCategoryGroupsMap.mockResolvedValue({});
    mockGetBudgetMonth.mockResolvedValue({ categoryGroups: [] });

    await expect(
      recommendBudgetPlan({
        month: '2025-03',
        lookbackMonths: 2,
        roundingIncrement: 1000,
        minimumFloor: 5000,
      }),
    ).rejects.toThrow('No expense categories are available to build a budget recommendation.');
  });
});
