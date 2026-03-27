import type { BudgetFile } from '../../types/index.js';

export function getBudgetIdentifiers(budget: BudgetFile): string[] {
  return [budget.groupId, budget.cloudFileId, budget.id].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
}

export function matchesBudgetIdentifier(budget: BudgetFile, identifier: string): boolean {
  return getBudgetIdentifiers(budget).includes(identifier);
}

export function getBudgetDownloadIdentifier(budget: BudgetFile): string {
  return budget.groupId || budget.cloudFileId || budget.id || '';
}

export function getBudgetLocalIdentifier(budget: BudgetFile): string | null {
  return typeof budget.id === 'string' && budget.id.length > 0 ? budget.id : null;
}

export function describeBudgetIdentifiers(budget: BudgetFile): string {
  return getBudgetIdentifiers(budget).join(' | ');
}

export async function loadBudgetByResolvedIdentifier(
  apiClient: {
    getBudgets: () => Promise<BudgetFile[]>;
    loadBudget?: (budgetId: string) => Promise<unknown>;
  },
  identifier: string,
): Promise<string> {
  const budgets = await apiClient.getBudgets();
  const matchingBudget = budgets.find((budget) => matchesBudgetIdentifier(budget, identifier));
  const loadableBudgetId = matchingBudget ? getBudgetLocalIdentifier(matchingBudget) : null;

  if (loadableBudgetId && typeof apiClient.loadBudget === 'function') {
    await apiClient.loadBudget(loadableBudgetId);
    return loadableBudgetId;
  }

  return identifier;
}
