// ----------------------------
// TOOLS
// ----------------------------
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { initActualApi, shutdownActualApi } from '../actual-api.js';
import {
  GetTransactionsArgs,
  SpendingByCategoryArgs,
  MonthlySummaryArgs,
  BalanceHistoryArgs,
  CreateTransactionArgs,
} from '../types.js';
import { handler as getTransactionsHandler } from './get-transactions/index.js';
import { handler as spendingByCategoryHandler } from './spending-by-category/index.js';
import { handler as monthlySummaryHandler } from './monthly-summary/index.js';
import { handler as balanceHistoryHandler } from './balance-history/index.js';
import { handler as createTransactionHandler } from './create-transaction/index.js';
import { error, errorFromCatch } from '../utils/response.js';
import { handler as getAccountsHandler } from './get-accounts/index.js';

import * as balanceHistory from './balance-history/index.js';
import * as createCategoryGroup from './categories/create-category-group/index.js';
import * as createCategory from './categories/create-category/index.js';
import * as deleteCategoryGroup from './categories/delete-category-group/index.js';
import * as deleteCategory from './categories/delete-category/index.js';
import * as getGroupedCategories from './categories/get-grouped-categories/index.js';
import * as updateCategoryGroup from './categories/update-category-group/index.js';
import * as updateCategory from './categories/update-category/index.js';
import * as getAccounts from './get-accounts/index.js';
import * as getTransactions from './get-transactions/index.js';
import * as monthlySummary from './monthly-summary/index.js';
import * as createPayee from './payees/create-payee/index.js';
import * as deletePayee from './payees/delete-payee/index.js';
import * as getPayees from './payees/get-payees/index.js';
import * as updatePayee from './payees/update-payee/index.js';
import * as createRule from './rules/create-rule/index.js';
import * as deleteRule from './rules/delete-rule/index.js';
import * as getRules from './rules/get-rules/index.js';
import * as updateRule from './rules/update-rule/index.js';
import * as spendingByCategory from './spending-by-category/index.js';
import * as updateTransaction from './update-transaction/index.js';
import * as createTransaction from './create-transaction/index.js';

// Account management tools
import * as createAccount from './accounts/create-account/index.js';
import * as updateAccount from './accounts/update-account/index.js';
import * as closeAccount from './accounts/close-account/index.js';
import * as reopenAccount from './accounts/reopen-account/index.js';
import * as deleteAccount from './accounts/delete-account/index.js';
import * as getAccountBalance from './accounts/get-account-balance/index.js';

// Budget operation tools
import * as setBudgetAmount from './budget/set-budget-amount/index.js';
import * as setBudgetCarryover from './budget/set-budget-carryover/index.js';
import * as holdBudgetForNextMonth from './budget/hold-budget-for-next-month/index.js';
import * as resetBudgetHold from './budget/reset-budget-hold/index.js';

// Schedule management tools
import * as createSchedule from './schedules/create-schedule/index.js';
import * as updateSchedule from './schedules/update-schedule/index.js';
import * as deleteSchedule from './schedules/delete-schedule/index.js';
import * as getSchedules from './schedules/get-schedules/index.js';

// Payee consolidation tools
import * as mergePayees from './payees/merge-payees/index.js';
import * as getPayeeRules from './payees/get-payee-rules/index.js';

// Budget file management tools
import * as getBudgets from './budgets/get-budgets/index.js';
import * as getBudgetMonths from './budgets/get-budget-months/index.js';
import * as getBudgetMonth from './budgets/get-budget-month/index.js';
import * as loadBudget from './budgets/load-budget/index.js';
import * as downloadBudget from './budgets/download-budget/index.js';
import * as sync from './budgets/sync/index.js';
import * as runBankSync from './budgets/run-bank-sync/index.js';
import * as runImport from './budgets/run-import/index.js';

// Utility tools
import * as getIdByName from './utilities/get-id-by-name/index.js';
import * as runQuery from './utilities/run-query/index.js';
import * as getServerVersion from './utilities/get-server-version/index.js';

const readTools = [
  getTransactions,
  spendingByCategory,
  monthlySummary,
  balanceHistory,
  getAccounts,
  getAccountBalance,
  getGroupedCategories,
  getPayees,
  getPayeeRules,
  getRules,
  getSchedules,
  getBudgets,
  getBudgetMonths,
  getBudgetMonth,
  getIdByName,
  runQuery,
  getServerVersion,
];

const writeTools = [
  createCategory,
  updateCategory,
  deleteCategory,
  createCategoryGroup,
  updateCategoryGroup,
  deleteCategoryGroup,
  createPayee,
  updatePayee,
  deletePayee,
  mergePayees,
  createRule,
  updateRule,
  deleteRule,
  updateTransaction,
  createTransaction,
  createAccount,
  updateAccount,
  closeAccount,
  reopenAccount,
  deleteAccount,
  setBudgetAmount,
  setBudgetCarryover,
  holdBudgetForNextMonth,
  resetBudgetHold,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  loadBudget,
  downloadBudget,
  sync,
  runBankSync,
  runImport,
];

export const setupTools = (server: Server, enableWrite: boolean): void => {
  // Selecting available tools based on permissions
  const allTools = enableWrite ? [...readTools, ...writeTools] : readTools;

  /**
   * Handler for listing available tools
   */
  server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: allTools.map((tool) => tool.schema),
    };
  });

  /**
   * Handler for calling tools
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      await initActualApi();
      const { name, arguments: args } = request.params;

      const tool = allTools.find((t) => (t as any).schema.name === name);
      if (!tool) {
        return error(
          `Unknown tool ${name}`,
          'Call list-tools to inspect supported tool names before retrying this request.',
        );
      }
      // Execute the requested tool
      switch (name) {
        case 'get-transactions': {
          // TODO: Validate against schema
          return getTransactionsHandler(args as unknown as GetTransactionsArgs);
        }

        case 'spending-by-category': {
          return spendingByCategoryHandler(args as unknown as SpendingByCategoryArgs);
        }

        case 'monthly-summary': {
          return monthlySummaryHandler(args as unknown as MonthlySummaryArgs);
        }

        case 'balance-history': {
          return balanceHistoryHandler(args as unknown as BalanceHistoryArgs);
        }

        case 'get-accounts': {
          return getAccountsHandler();
        }

        case 'create-transaction': {
          return createTransactionHandler(args as unknown as CreateTransactionArgs);
        }

        default:
          // For all other tools, use the handler from the tool module
          // @ts-expect-error: Argument type is handled by schema validation
          return tool.handler(args);
      }
    } catch (err) {
      console.error(`Error executing tool ${request.params.name}:`, err);
      return errorFromCatch(err, {
        fallbackMessage: `Failed to execute tool ${request.params.name}`,
        suggestion:
          'Check the Actual Budget server logs and ensure the provided arguments match the tool schema before retrying.',
      });
    } finally {
      await shutdownActualApi();
    }
  });
};
