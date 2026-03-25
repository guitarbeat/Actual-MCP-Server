import * as balanceHistory from '../../tools/balance-history/index.js';
import * as getBudget from '../../tools/budgets/get-budget/index.js';
import * as getBudgets from '../../tools/budgets/get-budgets/index.js';
import * as recommendBudgetPlan from '../../tools/budgets/recommend-budget-plan/index.js';
import * as switchBudget from '../../tools/budgets/switch-budget/index.js';
import * as getGroupedCategories from '../../tools/categories/get-grouped-categories/index.js';
import * as financialInsights from '../../tools/financial-insights/index.js';
import * as getAccounts from '../../tools/get-accounts/index.js';
import * as getTransactions from '../../tools/get-transactions/index.js';
import * as monthlySummary from '../../tools/monthly-summary/index.js';
import * as getPayees from '../../tools/payees/get-payees/index.js';
import * as getRules from '../../tools/rules/get-rules/index.js';
import * as getSchedules from '../../tools/schedules/get-schedules/index.js';
import * as spendingByCategory from '../../tools/spending-by-category/index.js';
import * as getAccountBalance from '../../tools/accounts/get-account-balance/index.js';
import { defineLegacyTools } from './common.js';

export const readToolDefinitions = defineLegacyTools([
  { ...getTransactions, requiresWrite: false, category: 'core' },
  { ...spendingByCategory, requiresWrite: false, category: 'core' },
  { ...monthlySummary, requiresWrite: false, category: 'core' },
  { ...financialInsights, requiresWrite: false, category: 'core' },
  { ...balanceHistory, requiresWrite: false, category: 'core' },
  { ...getAccounts, requiresWrite: false, category: 'core' },
  { ...getGroupedCategories, requiresWrite: false, category: 'core' },
  { ...getPayees, requiresWrite: false, category: 'core' },
  { ...getRules, requiresWrite: false, category: 'core' },
  { ...recommendBudgetPlan, requiresWrite: false, category: 'core' },
  { ...getSchedules, requiresWrite: false, category: 'core' },
  { ...getAccountBalance, requiresWrite: false, category: 'core' },
  { ...getBudget, requiresWrite: false, category: 'core' },
  { ...getBudgets, requiresWrite: false, category: 'nini' },
  { ...switchBudget, requiresWrite: true, category: 'nini' },
]);
