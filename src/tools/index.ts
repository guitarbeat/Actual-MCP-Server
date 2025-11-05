// ----------------------------
// TOOLS
// ----------------------------
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { initActualApi, shutdownActualApi } from '../actual-api.js';
import { error, errorFromCatch, MCPResponse } from '../core/response/index.js';
import { logToolExecution } from '../core/performance/performance-logger.js';
import { metricsTracker } from '../core/performance/metrics-tracker.js';

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

/**
 * Tool definition interface for registry-based tool management
 */
export interface ToolDefinition {
  schema: {
    name: string;
    description?: string;
    inputSchema: {
      type: string;
      properties?: Record<string, unknown>;
      required?: string[];
      [key: string]: unknown;
    };
  };
  handler: (args: any) => Promise<MCPResponse>;
  requiresWrite: boolean;
}

/**
 * Centralized tool registry with metadata
 * All tools are registered here with their schema, handler, and permission requirements
 */
const toolRegistry: ToolDefinition[] = [
  // Read-only tools
  { schema: getTransactions.schema, handler: getTransactions.handler, requiresWrite: false },
  { schema: spendingByCategory.schema, handler: spendingByCategory.handler, requiresWrite: false },
  { schema: monthlySummary.schema, handler: monthlySummary.handler, requiresWrite: false },
  { schema: balanceHistory.schema, handler: balanceHistory.handler, requiresWrite: false },
  { schema: getAccounts.schema, handler: getAccounts.handler, requiresWrite: false },
  { schema: getAccountBalance.schema, handler: getAccountBalance.handler, requiresWrite: false },
  { schema: getGroupedCategories.schema, handler: getGroupedCategories.handler, requiresWrite: false },
  { schema: getPayees.schema, handler: getPayees.handler, requiresWrite: false },
  { schema: getPayeeRules.schema, handler: getPayeeRules.handler, requiresWrite: false },
  { schema: getRules.schema, handler: getRules.handler, requiresWrite: false },
  { schema: getSchedules.schema, handler: getSchedules.handler, requiresWrite: false },
  { schema: getBudgets.schema, handler: getBudgets.handler, requiresWrite: false },
  { schema: getBudgetMonths.schema, handler: getBudgetMonths.handler, requiresWrite: false },
  { schema: getBudgetMonth.schema, handler: getBudgetMonth.handler, requiresWrite: false },
  { schema: getIdByName.schema, handler: getIdByName.handler, requiresWrite: false },
  { schema: runQuery.schema, handler: runQuery.handler, requiresWrite: false },
  { schema: getServerVersion.schema, handler: getServerVersion.handler, requiresWrite: false },

  // Write tools
  { schema: createCategory.schema, handler: createCategory.handler, requiresWrite: true },
  { schema: updateCategory.schema, handler: updateCategory.handler, requiresWrite: true },
  { schema: deleteCategory.schema, handler: deleteCategory.handler, requiresWrite: true },
  { schema: createCategoryGroup.schema, handler: createCategoryGroup.handler, requiresWrite: true },
  { schema: updateCategoryGroup.schema, handler: updateCategoryGroup.handler, requiresWrite: true },
  { schema: deleteCategoryGroup.schema, handler: deleteCategoryGroup.handler, requiresWrite: true },
  { schema: createPayee.schema, handler: createPayee.handler, requiresWrite: true },
  { schema: updatePayee.schema, handler: updatePayee.handler, requiresWrite: true },
  { schema: deletePayee.schema, handler: deletePayee.handler, requiresWrite: true },
  { schema: mergePayees.schema, handler: mergePayees.handler, requiresWrite: true },
  { schema: createRule.schema, handler: createRule.handler, requiresWrite: true },
  { schema: updateRule.schema, handler: updateRule.handler, requiresWrite: true },
  { schema: deleteRule.schema, handler: deleteRule.handler, requiresWrite: true },
  { schema: updateTransaction.schema, handler: updateTransaction.handler, requiresWrite: true },
  { schema: createTransaction.schema, handler: createTransaction.handler, requiresWrite: true },
  { schema: createAccount.schema, handler: createAccount.handler, requiresWrite: true },
  { schema: updateAccount.schema, handler: updateAccount.handler, requiresWrite: true },
  { schema: closeAccount.schema, handler: closeAccount.handler, requiresWrite: true },
  { schema: reopenAccount.schema, handler: reopenAccount.handler, requiresWrite: true },
  { schema: deleteAccount.schema, handler: deleteAccount.handler, requiresWrite: true },
  { schema: setBudgetAmount.schema, handler: setBudgetAmount.handler, requiresWrite: true },
  { schema: setBudgetCarryover.schema, handler: setBudgetCarryover.handler, requiresWrite: true },
  { schema: holdBudgetForNextMonth.schema, handler: holdBudgetForNextMonth.handler, requiresWrite: true },
  { schema: resetBudgetHold.schema, handler: resetBudgetHold.handler, requiresWrite: true },
  { schema: createSchedule.schema, handler: createSchedule.handler, requiresWrite: true },
  { schema: updateSchedule.schema, handler: updateSchedule.handler, requiresWrite: true },
  { schema: deleteSchedule.schema, handler: deleteSchedule.handler, requiresWrite: true },
  { schema: loadBudget.schema, handler: loadBudget.handler, requiresWrite: true },
  { schema: downloadBudget.schema, handler: downloadBudget.handler, requiresWrite: true },
  { schema: sync.schema, handler: sync.handler, requiresWrite: true },
  { schema: runBankSync.schema, handler: runBankSync.handler, requiresWrite: true },
  { schema: runImport.schema, handler: runImport.handler, requiresWrite: true },
];

/**
 * Get available tools based on write permission
 * @param enableWrite - Whether write operations are enabled
 * @returns Array of tool definitions available for the current permission level
 */
function getAvailableTools(enableWrite: boolean): ToolDefinition[] {
  return enableWrite ? toolRegistry : toolRegistry.filter((tool) => !tool.requiresWrite);
}

/**
 * Setup MCP tool handlers on the server
 * @param server - The MCP server instance
 * @param enableWrite - Whether write operations are enabled
 */
export const setupTools = (server: Server, enableWrite: boolean): void => {
  const availableTools = getAvailableTools(enableWrite);

  /**
   * Handler for listing available tools
   */
  server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: availableTools.map((tool) => tool.schema),
    };
  });

  /**
   * Handler for calling tools
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const startTime = Date.now();
    let success = true;

    try {
      await initActualApi();
      const { name, arguments: args } = request.params;

      // Find tool in registry
      const tool = toolRegistry.find((t) => t.schema.name === name);

      if (!tool) {
        success = false;
        return error(
          `Unknown tool '${name}'`,
          'Call list-tools to inspect supported tool names before retrying this request.'
        );
      }

      // Check write permission
      if (tool.requiresWrite && !enableWrite) {
        success = false;
        return error(
          `Tool '${name}' requires write permission`,
          'Start the server with the --enable-write flag to enable write operations.'
        );
      }

      // Execute tool handler
      const result = await tool.handler(args);
      return result;
    } catch (err) {
      success = false;
      return errorFromCatch(err, {
        fallbackMessage: `Failed to execute tool ${request.params.name}`,
        suggestion:
          'Check the Actual Budget server logs and ensure the provided arguments match the tool schema before retrying.',
        tool: request.params.name,
        operation: 'tool_execution',
        args: request.params.arguments,
      });
    } finally {
      const duration = Date.now() - startTime;
      metricsTracker.record(request.params.name, duration, success);
      logToolExecution(request.params.name, duration, success);

      await shutdownActualApi();
    }
  });
};
