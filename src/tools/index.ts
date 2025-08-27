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

const readTools = [
  getTransactions,
  spendingByCategory,
  monthlySummary,
  balanceHistory,
  getAccounts,
  getGroupedCategories,
  getPayees,
  getRules,
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
  createRule,
  updateRule,
  deleteRule,
  updateTransaction,
  createTransaction,
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

      const tool = allTools.find((t) => t.schema.name === name);
      if (!tool) {
        return error(`Unknown tool ${name}`);
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
          return error(`Unknown tool ${name}`);
      }

      // @ts-expect-error: Argument type is handled by Zod schema validation
      return tool.handler(args);
    } catch (err) {
      console.error(`Error executing tool ${request.params.name}:`, err);
      return errorFromCatch(err);
    } finally {
      await shutdownActualApi();
    }
  });
};
