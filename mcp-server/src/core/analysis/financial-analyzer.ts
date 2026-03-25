// ----------------------------
// FINANCIAL ANALYZER MODULE
// Server-side analysis to reduce context window load
// ----------------------------

import { q } from '@actual-app/api';
import { getAccounts, getBudgetMonth, getSchedules, runAQL } from '../api/actual-client.js';
import { fetchAccountBalances } from '../data/fetch-account-balances.js';
import { formatDate, getDateRange } from '../formatting/index.js';
import { getCurrentMonth } from '../utils/current-month.js';

// ----------------------------
// TYPES
// ----------------------------

export interface BudgetCategory {
  id: string;
  name: string;
  budgeted?: number;
  spent?: number;
}

export interface BudgetCategoryGroup {
  id: string;
  name: string;
  categories?: BudgetCategory[];
}

export interface BudgetMonthData {
  incomeAvailable?: number;
  toBudget?: number;
  categoryGroups?: BudgetCategoryGroup[];
}

export interface OverspendingItem {
  categoryId: string;
  categoryName: string;
  groupName: string;
  budgeted: number;
  spent: number;
  overage: number;
}

export interface UncategorizedSummary {
  count: number;
  totalAmount: number;
  topPayees: string[];
}

export interface AccountHealthItem {
  id: string;
  name: string;
  balance: number;
  status: 'negative' | 'low' | 'healthy';
}

export interface UpcomingScheduleItem {
  id: string;
  name: string;
  amount: number;
  nextDate: string;
  accountName: string;
}

export interface TrendsSummary {
  currentMonthSpending: number;
  previousMonthSpending: number;
  spendingChange: number;
  savingsRate: number | null;
}

export interface FinancialInsightsSummary {
  summary: string;
  month: string;
  overspending: OverspendingItem[];
  uncategorized: UncategorizedSummary;
  accountHealth: AccountHealthItem[];
  upcomingSchedules: UpcomingScheduleItem[];
  trends: TrendsSummary;
  partial: boolean;
  warnings: string[];
}

// ----------------------------
// HELPER FUNCTIONS
// ----------------------------

/**
 * Get previous month in YYYY-MM format
 */
function getPreviousMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// ----------------------------
// ANALYSIS FUNCTIONS
// ----------------------------

/**
 * Analyze categories where spending exceeds budget
 */
export async function analyzeOverspending(
  month: string,
  budgetDataPromise?: Promise<BudgetMonthData>,
): Promise<OverspendingItem[]> {
  const budgetData = budgetDataPromise
    ? await budgetDataPromise
    : ((await getBudgetMonth(month)) as unknown as BudgetMonthData);

  const overspending: OverspendingItem[] = [];

  if (!budgetData?.categoryGroups) {
    return overspending;
  }

  for (const group of budgetData.categoryGroups) {
    if (!group.categories) continue;

    for (const category of group.categories) {
      const budgeted = category.budgeted ?? 0;
      const spent = Math.abs(category.spent ?? 0);

      if (spent > budgeted && budgeted > 0) {
        overspending.push({
          categoryId: category.id,
          categoryName: category.name,
          groupName: group.name,
          budgeted,
          spent,
          overage: spent - budgeted,
        });
      }
    }
  }

  // Sort by overage amount (highest first)
  return overspending.sort((a, b) => b.overage - a.overage);
}

/**
 * Find transactions without categories
 */
export async function findUncategorizedTransactions(month: string): Promise<UncategorizedSummary> {
  const startOfMonth = `${month}-01`;
  const endOfMonth = formatDate(new Date()); // Or calculate end of the specific month
  const { startDate, endDate } = getDateRange(startOfMonth, endOfMonth);

  // Optimization: Use AQL to fetch only uncategorized transactions instead of fetching all transactions
  // This significantly reduces data transfer and processing overhead.
  const query = q('transactions')
    .filter({
      date: { $gte: startDate, $lte: endDate },
      category: null,
      is_parent: false, // Exclude parent transactions to avoid double counting
    })
    .select(['amount', 'payee.name']);

  const result = (await runAQL(query)) as {
    data: Array<{ amount: number; payee: { name: string } | null }>;
  };
  const { data } = result;

  let count = 0;
  let totalAmount = 0;
  const payeeCounts: Record<string, number> = {};

  for (const tx of data) {
    count++;
    totalAmount += Math.abs(tx.amount);

    // Track payee frequency
    const payeeName = tx.payee?.name || 'Unknown';
    payeeCounts[payeeName] = (payeeCounts[payeeName] || 0) + 1;
  }

  // Get top 5 payees by frequency
  const topPayees = Object.entries(payeeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  return { count, totalAmount, topPayees };
}

/**
 * Get account health summary
 */
export async function getAccountHealthSummary(): Promise<{
  items: AccountHealthItem[];
  warnings: string[];
}> {
  const accounts = await getAccounts();
  const healthItems: AccountHealthItem[] = [];

  const openAccounts = accounts.filter((a) => !a.closed);
  const balanceResult = await fetchAccountBalances(openAccounts);

  openAccounts.forEach((account) => {
    if (!(account.id in balanceResult.balancesByAccountId)) {
      return;
    }

    const balance = balanceResult.balancesByAccountId[account.id];
    let status: 'negative' | 'low' | 'healthy' = 'healthy';

    if (balance < 0) {
      status = 'negative';
    } else if (balance < 10000) {
      // Less than $100 considered low
      status = 'low';
    }

    healthItems.push({
      id: account.id,
      name: account.name,
      balance,
      status,
    });
  });

  // Sort: negative first, then low, then healthy
  const statusOrder = { negative: 0, low: 1, healthy: 2 };
  return {
    items: healthItems.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]),
    warnings: balanceResult.warnings.map(
      ({ accountName, error }) => `${accountName}: balances unavailable (${error})`,
    ),
  };
}

/**
 * Get upcoming scheduled transactions
 */
export async function getUpcomingSchedulesSummary(days = 14): Promise<{
  items: UpcomingScheduleItem[];
  warnings: string[];
}> {
  try {
    const schedules = (await getSchedules()) as Array<{
      id: string;
      name?: string;
      _payee?: { name?: string };
      _amount?: number;
      next_date?: string;
      _account?: { name?: string };
    }>;

    if (!schedules || !Array.isArray(schedules)) {
      return { items: [], warnings: [] };
    }

    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const upcoming: UpcomingScheduleItem[] = [];

    for (const schedule of schedules) {
      if (!schedule.next_date) continue;

      const nextDate = new Date(schedule.next_date);
      if (nextDate >= now && nextDate <= futureDate) {
        upcoming.push({
          id: schedule.id,
          name: schedule.name || schedule._payee?.name || 'Unnamed',
          amount: schedule._amount ?? 0,
          nextDate: schedule.next_date,
          accountName: schedule._account?.name ?? 'Unknown',
        });
      }
    }

    // Sort by next date (soonest first)
    return {
      items: upcoming.sort(
        (a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime(),
      ),
      warnings: [],
    };
  } catch {
    return {
      items: [],
      warnings: ['Scheduled transactions unavailable from the current Actual API connection'],
    };
  }
}

/**
 * Calculate spending trends
 */
export async function calculateTrends(
  month: string,
  currentBudgetPromise?: Promise<BudgetMonthData>,
): Promise<TrendsSummary> {
  const currentMonthStart = `${month}-01`;
  const { startDate: _currentStart, endDate: _currentEnd } = getDateRange(currentMonthStart);

  const prevMonth = getPreviousMonth(month);
  const prevMonthStart = `${prevMonth}-01`;
  const { startDate: _prevStart, endDate: _prevEnd } = getDateRange(
    prevMonthStart,
    `${prevMonth}-31`,
  ); // Rough end is fine as API filters

  const [currentBudget, previousBudget] = await Promise.all([
    currentBudgetPromise || (getBudgetMonth(month) as unknown as Promise<BudgetMonthData>),
    getBudgetMonth(prevMonth) as unknown as Promise<BudgetMonthData>,
  ]);

  // Calculate total spending for each month
  const calculateSpending = (budget: BudgetMonthData): number => {
    let total = 0;
    for (const group of budget?.categoryGroups ?? []) {
      for (const category of group?.categories ?? []) {
        total += Math.abs(category.spent ?? 0);
      }
    }
    return total;
  };

  const currentMonthSpending = calculateSpending(currentBudget);
  const previousMonthSpending = calculateSpending(previousBudget);
  const spendingChange =
    previousMonthSpending > 0
      ? ((currentMonthSpending - previousMonthSpending) / previousMonthSpending) * 100
      : 0;

  // Calculate savings rate if income is available
  const income = currentBudget?.incomeAvailable ?? currentBudget?.toBudget ?? 0;
  const savingsRate = income > 0 ? ((income - currentMonthSpending) / income) * 100 : null;

  return {
    currentMonthSpending,
    previousMonthSpending,
    spendingChange,
    savingsRate,
  };
}

// ----------------------------
// MAIN ORCHESTRATOR
// ----------------------------

/**
 * Generate comprehensive financial insights summary
 */
export async function generateInsightsSummary(
  month?: string,
  options: { includeSchedules?: boolean; scheduleDays?: number } = {},
): Promise<FinancialInsightsSummary> {
  const targetMonth = month ?? getCurrentMonth();
  const { includeSchedules = true, scheduleDays = 14 } = options;

  // Optimization: Fetch budget data once and share it between analyses
  // This reduces the number of calls to getBudgetMonth from 2 to 1
  const budgetPromise = getBudgetMonth(targetMonth) as unknown as Promise<BudgetMonthData>;

  // Run all analyses in parallel for performance
  const [overspending, uncategorized, accountHealthResult, upcomingSchedulesResult, trends] =
    await Promise.all([
      analyzeOverspending(targetMonth, budgetPromise),
      findUncategorizedTransactions(targetMonth),
      getAccountHealthSummary(),
      includeSchedules
        ? getUpcomingSchedulesSummary(scheduleDays)
        : Promise.resolve({ items: [], warnings: [] }),
      calculateTrends(targetMonth, budgetPromise),
    ]);
  const accountHealth = accountHealthResult.items;
  const accountHealthWarnings = accountHealthResult.warnings;
  const upcomingSchedules = upcomingSchedulesResult.items;
  const scheduleWarnings = upcomingSchedulesResult.warnings;
  const warnings = [...accountHealthWarnings, ...scheduleWarnings];

  // Generate human-readable summary
  const summaryParts: string[] = [];

  if (overspending.length > 0) {
    summaryParts.push(`${overspending.length} categories overspent`);
  }
  if (uncategorized.count > 0) {
    summaryParts.push(`${uncategorized.count} uncategorized transactions`);
  }

  const negativeAccounts = accountHealth.filter((a) => a.status === 'negative').length;
  if (negativeAccounts > 0) {
    summaryParts.push(`${negativeAccounts} accounts with negative balance`);
  }

  if (upcomingSchedules.length > 0) {
    summaryParts.push(`${upcomingSchedules.length} scheduled transactions upcoming`);
  }

  if (trends.spendingChange !== 0) {
    const direction = trends.spendingChange > 0 ? 'up' : 'down';
    summaryParts.push(
      `spending ${direction} ${Math.abs(trends.spendingChange).toFixed(1)}% vs last month`,
    );
  }

  const summary = summaryParts.length > 0 ? summaryParts.join(', ') : 'No issues detected';

  return {
    summary,
    month: targetMonth,
    overspending,
    uncategorized,
    accountHealth,
    upcomingSchedules,
    trends,
    partial: warnings.length > 0,
    warnings,
  };
}
