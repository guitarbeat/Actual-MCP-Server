// ----------------------------
// TOOLS
// ----------------------------
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { initActualApi } from '../actual-api.js';
import { error, errorFromCatch, MCPResponse } from '../core/response/index.js';
import { features } from '../features.js';
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

// Budget operation tools
import * as setBudget from './set-budget/index.js';
import * as manageBudgetHold from './budget/manage-budget-hold/index.js';
import * as getBudget from './budgets/get-budget/index.js';
import * as importTransactions from './budgets/import-transactions/index.js';
import * as getBudgets from './budgets/get-budgets/index.js';
import * as switchBudget from './budgets/switch-budget/index.js';

// Schedule management tools
import * as getSchedules from './schedules/get-schedules/index.js';

// Payee tools
import * as mergePayees from './payees/merge-payees/index.js';

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
type ToolCategory = 'core';

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
  { schema: setBudget.schema, handler: setBudget.handler, requiresWrite: true, category: 'core' },
  { schema: mergePayees.schema, handler: mergePayees.handler, requiresWrite: true, category: 'core' },
  { schema: importTransactions.schema, handler: importTransactions.handler, requiresWrite: true, category: 'core' },
  { schema: manageEntity.schema, handler: manageEntity.handler, requiresWrite: true, category: 'core' },

  // Budget tools (now core)
  { schema: getBudget.schema, handler: getBudget.handler, requiresWrite: false, category: 'core' },
  {
    schema: manageBudgetHold.schema,
    handler: manageBudgetHold.handler,
    requiresWrite: true,
    category: 'core',
  },

  // Budget file management (optional utilities)
  { schema: getBudgets.schema, handler: getBudgets.handler, requiresWrite: false, category: 'core' },
  { schema: switchBudget.schema, handler: switchBudget.handler, requiresWrite: true, category: 'core' },

  // Query tool (optional, requires ENABLE_UTILITY_TOOLS=true)
  ...(features.utilityTools
    ? [{ schema: runQuery.schema, handler: runQuery.handler, requiresWrite: false, category: 'core' as const }]
    : []),
];

/**
 * Get available tools based on write permission and feature flags
 * @param enableWrite - Whether write operations are enabled
 * @returns Array of tool definitions available for the current permission level and enabled features
 */
export function getAvailableTools(enableWrite: boolean): ToolDefinition[] {
  // Filter tools based on write permission only
  return toolRegistry.filter((tool) => {
    // Filter by write permission
    if (tool.requiresWrite && !enableWrite) {
      return false;
    }

    // All tools are core now
    return true;
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
