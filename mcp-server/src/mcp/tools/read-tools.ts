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
import * as getTags from '../../tools/tags/get-tags/index.js';
import * as auditUncategorizedTransactions from '../../tools/transactions/audit-uncategorized-transactions/index.js';
import * as spendingByCategory from '../../tools/spending-by-category/index.js';
import * as getAccountBalance from '../../tools/accounts/get-account-balance/index.js';
import { defineLegacyTool } from './common.js';

export const readToolDefinitions = [
  defineLegacyTool({ ...auditUncategorizedTransactions, requiresWrite: false, category: 'core' }),
  defineLegacyTool({ ...getTransactions, requiresWrite: false, category: 'core' }),
  defineLegacyTool({ ...spendingByCategory, requiresWrite: false, category: 'core' }),
  defineLegacyTool({ ...monthlySummary, requiresWrite: false, category: 'core' }),
  defineLegacyTool({ ...financialInsights, requiresWrite: false, category: 'core' }),
  defineLegacyTool({ ...balanceHistory, requiresWrite: false, category: 'core' }),
  defineLegacyTool({ ...getAccounts, requiresWrite: false, category: 'core' }),
  defineLegacyTool({ ...getGroupedCategories, requiresWrite: false, category: 'core' }),
  defineLegacyTool({ ...getPayees, requiresWrite: false, category: 'core' }),
  defineLegacyTool({ ...getTags, requiresWrite: false, category: 'core' }),
  defineLegacyTool({ ...getRules, requiresWrite: false, category: 'core' }),
  defineLegacyTool({ ...recommendBudgetPlan, requiresWrite: false, category: 'core' }),
  defineLegacyTool({ ...getSchedules, requiresWrite: false, category: 'core' }),
  defineLegacyTool({ ...getAccountBalance, requiresWrite: false, category: 'core' }),
  defineLegacyTool({ ...getBudget, requiresWrite: false, category: 'core' }),
  defineLegacyTool({ ...getBudgets, requiresWrite: false, category: 'nini' }),
  defineLegacyTool({ ...switchBudget, requiresWrite: true, category: 'nini' }),
];
