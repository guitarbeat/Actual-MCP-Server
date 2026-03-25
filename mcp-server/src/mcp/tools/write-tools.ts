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
import * as updateTransaction from '../../tools/transactions/update-transaction/index.js';
import { defineLegacyTools } from './common.js';

export const writeToolDefinitions = defineLegacyTools([
  { ...setBudget, requiresWrite: true, category: 'core' },
  { ...mergePayees, requiresWrite: true, category: 'core' },
  { ...importTransactions, requiresWrite: true, category: 'core' },
  { ...importTransactionBatch, requiresWrite: true, category: 'core' },
  { ...applyBudgetPlan, requiresWrite: true, category: 'core' },
  { ...setAccountStartingBalance, requiresWrite: true, category: 'core' },
  { ...reconcileAccount, requiresWrite: true, category: 'core' },
  { ...createSchedule, requiresWrite: true, category: 'core' },
  { ...updateSchedule, requiresWrite: true, category: 'core' },
  { ...deleteSchedule, requiresWrite: true, category: 'core' },
  { ...createTransaction, requiresWrite: true, category: 'core' },
  { ...updateTransaction, requiresWrite: true, category: 'core' },
  { ...deleteTransaction, requiresWrite: true, category: 'core' },
  { ...closeAccount, requiresWrite: true, category: 'nini' },
  { ...reopenAccount, requiresWrite: true, category: 'nini' },
  { ...holdBudget, requiresWrite: true, category: 'nini' },
  { ...resetBudgetHold, requiresWrite: true, category: 'nini' },
]);
