import { format, parse } from 'date-fns';
import { getBudgetMonth } from '../../../core/api/actual-client.js';
import { fetchAllCategories, fetchAllCategoryGroupsMap } from '../../../core/data/index.js';
import { normalizeName } from '../../../core/utils/name-utils.js';
import type { Category } from '../../../core/types/domain.js';
import type {
  BudgetRecommendation,
  BudgetRecommendationResult,
  RecommendBudgetPlanArgs,
} from './types.js';

interface CategoryBudgetData {
  id?: string;
  name: string;
  spent?: number;
}

interface CategoryGroupBudgetData {
  name: string;
  is_income?: boolean;
  categories?: CategoryBudgetData[];
}

interface BudgetMonthData {
  categoryGroups?: CategoryGroupBudgetData[];
}

interface CategoryHistory {
  categoryId: string;
  categoryName: string;
  groupName: string;
  amounts: number[];
}

function getPreviousMonths(targetMonth: string, lookbackMonths: number): string[] {
  const targetDate = parse(`${targetMonth}-01`, 'yyyy-MM-dd', new Date());
  const months: string[] = [];

  for (let offset = lookbackMonths; offset >= 1; offset -= 1) {
    const monthDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - offset, 1);
    months.push(format(monthDate, 'yyyy-MM'));
  }

  return months;
}

function categoryKey(groupName: string, categoryName: string): string {
  return `${normalizeName(groupName)}::${normalizeName(categoryName)}`;
}

function buildCategoryHistories(
  categories: Category[],
  categoryGroupsById: Record<string, { name: string }>,
  months: string[],
): Map<string, CategoryHistory> {
  const histories = new Map<string, CategoryHistory>();

  for (const category of categories) {
    if (category.is_income) {
      continue;
    }

    histories.set(category.id, {
      categoryId: category.id,
      categoryName: category.name,
      groupName: categoryGroupsById[category.group_id]?.name ?? 'Uncategorized',
      amounts: Array(months.length).fill(0),
    });
  }

  return histories;
}

function resolveBudgetCategoryId(
  budgetCategory: CategoryBudgetData,
  groupName: string,
  categoriesByCompositeKey: Map<string, string>,
): string | undefined {
  return (
    budgetCategory.id || categoriesByCompositeKey.get(categoryKey(groupName, budgetCategory.name))
  );
}

function isFixedCost(amounts: number[], roundingIncrement: number): boolean {
  const nonZero = amounts.filter((amount) => amount > 0);

  if (nonZero.length < 2) {
    return false;
  }

  const average = nonZero.reduce((sum, amount) => sum + amount, 0) / nonZero.length;
  const spread = Math.max(...nonZero) - Math.min(...nonZero);

  return spread <= Math.max(roundingIncrement, average * 0.1);
}

function roundUp(amount: number, increment: number): number {
  if (increment <= 1) {
    return Math.round(amount);
  }

  return Math.ceil(amount / increment) * increment;
}

function buildRecommendation(
  history: CategoryHistory,
  months: string[],
  roundingIncrement: number,
  minimumFloor: number,
): BudgetRecommendation {
  const totalSpent = history.amounts.reduce((sum, amount) => sum + amount, 0);
  const averageSpent = totalSpent / months.length;
  const latestSpent = history.amounts[history.amounts.length - 1] ?? 0;
  const hasSpending = history.amounts.some((amount) => amount > 0);
  const fixedCost = isFixedCost(history.amounts, roundingIncrement);

  if (!hasSpending) {
    return {
      categoryId: history.categoryId,
      categoryName: history.categoryName,
      groupName: history.groupName,
      averageSpent,
      latestSpent,
      recommendedAmount: 0,
      method: 'none',
      reason: 'No spending was observed in the analysis window.',
      monthlySpend: months.map((month, index) => ({
        month,
        amount: history.amounts[index] ?? 0,
      })),
    };
  }

  if (fixedCost) {
    const fixedAmount = Math.max(latestSpent, minimumFloor);
    return {
      categoryId: history.categoryId,
      categoryName: history.categoryName,
      groupName: history.groupName,
      averageSpent,
      latestSpent,
      recommendedAmount: fixedAmount,
      method: 'fixed',
      reason: 'Spending is stable enough to treat this as a fixed recurring cost.',
      monthlySpend: months.map((month, index) => ({
        month,
        amount: history.amounts[index] ?? 0,
      })),
    };
  }

  const roundedAverage = roundUp(averageSpent, roundingIncrement);
  const recommendedAmount = roundedAverage > 0 ? Math.max(roundedAverage, minimumFloor) : 0;

  return {
    categoryId: history.categoryId,
    categoryName: history.categoryName,
    groupName: history.groupName,
    averageSpent,
    latestSpent,
    recommendedAmount,
    method: 'average',
    reason: 'Recommendation is based on the average monthly spending across the lookback window.',
    monthlySpend: months.map((month, index) => ({
      month,
      amount: history.amounts[index] ?? 0,
    })),
  };
}

export async function recommendBudgetPlan(
  args: RecommendBudgetPlanArgs,
): Promise<BudgetRecommendationResult> {
  const monthsAnalyzed = getPreviousMonths(args.month, args.lookbackMonths);
  const [categories, categoryGroupsById, budgetMonths] = await Promise.all([
    fetchAllCategories(),
    fetchAllCategoryGroupsMap(),
    Promise.allSettled(
      monthsAnalyzed.map(async (month) => ({
        month,
        data: (await getBudgetMonth(month)) as BudgetMonthData,
      })),
    ),
  ]);

  const categoryHistories = buildCategoryHistories(categories, categoryGroupsById, monthsAnalyzed);
  const categoriesByCompositeKey = new Map<string, string>();

  categories.forEach((category) => {
    const groupName = categoryGroupsById[category.group_id]?.name;
    if (groupName) {
      categoriesByCompositeKey.set(categoryKey(groupName, category.name), category.id);
    }
  });

  const warnings: string[] = [];

  budgetMonths.forEach((result, monthIndex) => {
    if (result.status === 'rejected') {
      warnings.push(
        `Unable to load budget data for ${monthsAnalyzed[monthIndex]}: ${
          result.reason instanceof Error ? result.reason.message : String(result.reason)
        }`,
      );
      return;
    }

    for (const group of result.value.data.categoryGroups ?? []) {
      if (group.is_income) {
        continue;
      }

      for (const category of group.categories ?? []) {
        const resolvedId = resolveBudgetCategoryId(category, group.name, categoriesByCompositeKey);

        if (!resolvedId) {
          warnings.push(
            `Skipped category '${category.name}' in group '${group.name}' for ${result.value.month} because it could not be resolved.`,
          );
          continue;
        }

        const history = categoryHistories.get(resolvedId);
        if (history) {
          history.amounts[monthIndex] = Math.abs(category.spent ?? 0);
        }
      }
    }
  });

  if (categoryHistories.size === 0) {
    throw new Error('No expense categories are available to build a budget recommendation.');
  }

  const recommendations = Array.from(categoryHistories.values())
    .map((history) =>
      buildRecommendation(history, monthsAnalyzed, args.roundingIncrement, args.minimumFloor),
    )
    .sort((left, right) => right.recommendedAmount - left.recommendedAmount);

  return {
    month: args.month,
    monthsAnalyzed,
    roundingIncrement: args.roundingIncrement,
    minimumFloor: args.minimumFloor,
    recommendations,
    totals: {
      recommendedAmount: recommendations.reduce(
        (sum, recommendation) => sum + recommendation.recommendedAmount,
        0,
      ),
      categoriesWithSpending: recommendations.filter(
        (recommendation) => recommendation.averageSpent > 0,
      ).length,
      fixedCategories: recommendations.filter((recommendation) => recommendation.method === 'fixed')
        .length,
    },
    warnings,
  };
}
