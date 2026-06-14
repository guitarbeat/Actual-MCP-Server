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
import * as backupBudget from '../../tools/backups/make-backup/index.js';
import * as restoreBudget from '../../tools/backups/restore-budget/index.js';

import { defineTool } from './common.js';

export const writeToolDefinitions = [
  defineTool({ ...setBudget, requiresWrite: true, category: 'core' }),
  defineTool({ ...mergePayees, requiresWrite: true, category: 'core' }),
  defineTool({ ...importTransactions, requiresWrite: true, category: 'core' }),
  defineTool({ ...importTransactionBatch, requiresWrite: true, category: 'core' }),
  defineTool({ ...applyBudgetPlan, requiresWrite: true, category: 'core' }),
  defineTool({ ...setAccountStartingBalance, requiresWrite: true, category: 'core' }),
  defineTool({ ...reconcileAccount, requiresWrite: true, category: 'core' }),
  defineTool({ ...createSchedule, requiresWrite: true, category: 'core' }),
  defineTool({ ...updateSchedule, requiresWrite: true, category: 'core' }),
  defineTool({ ...deleteSchedule, requiresWrite: true, category: 'core' }),
  defineTool({ ...createTransaction, requiresWrite: true, category: 'core' }),
  defineTool({ ...applyHistoricalTransfers, requiresWrite: true, category: 'core' }),
  defineTool({ ...updateTransaction, requiresWrite: true, category: 'core' }),
  defineTool({ ...deleteTransaction, requiresWrite: true, category: 'core' }),
  defineTool({ ...closeAccount, requiresWrite: true, category: 'advanced' }),
  defineTool({ ...reopenAccount, requiresWrite: true, category: 'advanced' }),
  defineTool({ ...holdBudget, requiresWrite: true, category: 'advanced' }),
  defineTool({ ...resetBudgetHold, requiresWrite: true, category: 'advanced' }),
  defineTool({ ...backupBudget, requiresWrite: true, category: 'advanced' }),
  defineTool({ ...restoreBudget, requiresWrite: true, category: 'advanced' }),

];
