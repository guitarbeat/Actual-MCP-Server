import * as closeAccount from '../../tools/accounts/close-account/index.js';
import * as reconcileAccount from '../../tools/accounts/reconcile-account/index.js';
import * as reopenAccount from '../../tools/accounts/reopen-account/index.js';
import * as setAccountStartingBalance from '../../tools/accounts/set-account-starting-balance/index.js';
import * as holdBudget from '../../tools/budget/hold-budget/index.js';
import * as resetBudgetHold from '../../tools/budget/reset-budget-hold/index.js';
import * as applyBudgetPlan from '../../tools/budgets/apply-budget-plan/index.js';
import * as importTransactions from '../../tools/budgets/import-transactions/index.js';
import * as mergePayees from '../../tools/payees/merge-payees/index.js';
import * as createSchedule from '../../tools/schedules/create-schedule/index.js';
import * as deleteSchedule from '../../tools/schedules/delete-schedule/index.js';
import * as updateSchedule from '../../tools/schedules/update-schedule/index.js';
import * as setBudget from '../../tools/set-budget/index.js';
import * as createTransaction from '../../tools/transactions/create-transaction/index.js';
import * as deleteTransaction from '../../tools/transactions/delete-transaction/index.js';
import * as importTransactionBatch from '../../tools/transactions/import-transaction-batch/index.js';
import * as applyHistoricalTransfers from '../../tools/transactions/apply-historical-transfers/index.js';
import * as updateTransaction from '../../tools/transactions/update-transaction/index.js';
import { defineLegacyTool } from './common.js';

export const writeToolDefinitions = [
  defineLegacyTool({ ...setBudget, requiresWrite: true, category: 'core' }),
  defineLegacyTool({ ...mergePayees, requiresWrite: true, category: 'core' }),
  defineLegacyTool({ ...importTransactions, requiresWrite: true, category: 'core' }),
  defineLegacyTool({ ...importTransactionBatch, requiresWrite: true, category: 'core' }),
  defineLegacyTool({ ...applyBudgetPlan, requiresWrite: true, category: 'core' }),
  defineLegacyTool({ ...setAccountStartingBalance, requiresWrite: true, category: 'core' }),
  defineLegacyTool({ ...reconcileAccount, requiresWrite: true, category: 'core' }),
  defineLegacyTool({ ...createSchedule, requiresWrite: true, category: 'core' }),
  defineLegacyTool({ ...updateSchedule, requiresWrite: true, category: 'core' }),
  defineLegacyTool({ ...deleteSchedule, requiresWrite: true, category: 'core' }),
  defineLegacyTool({ ...createTransaction, requiresWrite: true, category: 'core' }),
  defineLegacyTool({ ...applyHistoricalTransfers, requiresWrite: true, category: 'core' }),
  defineLegacyTool({ ...updateTransaction, requiresWrite: true, category: 'core' }),
  defineLegacyTool({ ...deleteTransaction, requiresWrite: true, category: 'core' }),
  defineLegacyTool({ ...closeAccount, requiresWrite: true, category: 'advanced' }),
  defineLegacyTool({ ...reopenAccount, requiresWrite: true, category: 'advanced' }),
  defineLegacyTool({ ...holdBudget, requiresWrite: true, category: 'advanced' }),
  defineLegacyTool({ ...resetBudgetHold, requiresWrite: true, category: 'advanced' }),
];
