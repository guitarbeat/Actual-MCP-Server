// ----------------------------
// TOOLS
// ----------------------------
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { initActualApi } from '../actual-api.js';
import { error, errorFromCatch, MCPResponse } from '../core/response/index.js';
import { logToolExecution } from '../core/performance/performance-logger.js';
import { metricsTracker } from '../core/performance/metrics-tracker.js';

import * as balanceHistory from './balance-history/index.js';
import * as getGroupedCategories from './categories/get-grouped-categories/index.js';
import * as getAccounts from './get-accounts/index.js';
import * as getTransactions from './get-transactions/index.js';
import * as monthlySummary from './monthly-summary/index.js';
import * as getPayees from './payees/get-payees/index.js';
import * as getRules from './rules/get-rules/index.js';
import * as spendingByCategory from './spending-by-category/index.js';
import * as manageTransaction from './manage-transaction/index.js';

// Account management tools
import * as updateAccount from './accounts/update-account/index.js';

// Budget operation tools
import * as setBudget from './set-budget/index.js';
import * as holdBudgetForNextMonth from './budget/hold-budget-for-next-month/index.js';
import * as resetBudgetHold from './budget/reset-budget-hold/index.js';
import * as getBudgetMonths from './budgets/get-budget-months/index.js';
import * as getBudgetMonth from './budgets/get-budget-month/index.js';
import * as runBankSync from './budgets/run-bank-sync/index.js';
import * as runImport from './budgets/run-import/index.js';

// Schedule management tools
import * as getSchedules from './schedules/get-schedules/index.js';

// Payee tools
import * as mergePayees from './payees/merge-payees/index.js';
import * as getPayeeRules from './payees/get-payee-rules/index.js';

// Entity management
import * as manageEntity from './manage-entity/index.js';

// Utility tools (optional)
import * as runQuery from './utilities/run-query/index.js';

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
 * Tool category for feature flag filtering
 */
type ToolCategory = 'core' | 'utility';

/**
 * Extended tool definition with category for feature flag filtering
 */
interface CategorizedToolDefinition {
  schema: {
    name: string;
    description?: string;
    inputSchema: any;
  };
  handler: (args: any) => Promise<MCPResponse>;
  requiresWrite: boolean;
  category: ToolCategory;
}

/**
 * Centralized tool registry with metadata
 * All tools are registered here with their schema, handler, permission requirements, and category
 */
const toolRegistry: CategorizedToolDefinition[] = [
  // Core read-only tools
  { schema: getTransactions.schema, handler: getTransactions.handler, requiresWrite: false, category: 'core' },
  { schema: spendingByCategory.schema, handler: spendingByCategory.handler, requiresWrite: false, category: 'core' },
  { schema: monthlySummary.schema, handler: monthlySummary.handler, requiresWrite: false, category: 'core' },
  { schema: balanceHistory.schema, handler: balanceHistory.handler, requiresWrite: false, category: 'core' },
  { schema: getAccounts.schema, handler: getAccounts.handler, requiresWrite: false, category: 'core' },
  {
    schema: getGroupedCategories.schema,
    handler: getGroupedCategories.handler,
    requiresWrite: false,
    category: 'core',
  },
  { schema: getPayees.schema, handler: getPayees.handler, requiresWrite: false, category: 'core' },
  { schema: getRules.schema, handler: getRules.handler, requiresWrite: false, category: 'core' },
  { schema: getSchedules.schema, handler: getSchedules.handler, requiresWrite: false, category: 'core' },

  // Core write tools
  { schema: manageTransaction.schema, handler: manageTransaction.handler, requiresWrite: true, category: 'core' },
  { schema: updateAccount.schema, handler: updateAccount.handler, requiresWrite: true, category: 'core' },
  { schema: setBudget.schema, handler: setBudget.handler, requiresWrite: true, category: 'core' },
  { schema: mergePayees.schema, handler: mergePayees.handler, requiresWrite: true, category: 'core' },
  { schema: runBankSync.schema, handler: runBankSync.handler, requiresWrite: true, category: 'core' },
  { schema: runImport.schema, handler: runImport.handler, requiresWrite: true, category: 'core' },
  { schema: manageEntity.schema, handler: manageEntity.handler, requiresWrite: true, category: 'core' },

  // Budget tools (now core)
  { schema: getBudgetMonths.schema, handler: getBudgetMonths.handler, requiresWrite: false, category: 'core' },
  { schema: getBudgetMonth.schema, handler: getBudgetMonth.handler, requiresWrite: false, category: 'core' },
  {
    schema: holdBudgetForNextMonth.schema,
    handler: holdBudgetForNextMonth.handler,
    requiresWrite: true,
    category: 'core',
  },
  { schema: resetBudgetHold.schema, handler: resetBudgetHold.handler, requiresWrite: true, category: 'core' },

  // Payee rules (now core)
  { schema: getPayeeRules.schema, handler: getPayeeRules.handler, requiresWrite: false, category: 'core' },

  // Utility tools (optional - power users only)
  { schema: runQuery.schema, handler: runQuery.handler, requiresWrite: false, category: 'utility' },
];

/**
 * Get available tools based on write permission and feature flags
 * @param enableWrite - Whether write operations are enabled
 * @returns Array of tool definitions available for the current permission level and enabled features
 */
export function getAvailableTools(enableWrite: boolean): ToolDefinition[] {
  // Check feature flags from environment variables
  const enableUtilityTools = process.env.ENABLE_UTILITY_TOOLS === 'true';

  // Filter tools based on write permission and feature flags
  return toolRegistry.filter((tool) => {
    // Filter by write permission
    if (tool.requiresWrite && !enableWrite) {
      return false;
    }

    // Filter by category based on feature flags
    switch (tool.category) {
      case 'core':
        return true;
      case 'utility':
        return enableUtilityTools;
      default:
        return false;
    }
  });
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

      // Check if tool is disabled by feature flags
      const enableUtilityTools = process.env.ENABLE_UTILITY_TOOLS === 'true';

      if (tool.category === 'utility' && !enableUtilityTools) {
        success = false;
        return error(
          `Tool '${name}' is not enabled`,
          'Set ENABLE_UTILITY_TOOLS=true in your environment to enable utility tools (run-query).'
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
    }
  });
};
