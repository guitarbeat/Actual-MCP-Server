// ----------------------------
// TOOLS
// ----------------------------
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { initActualApi } from '../core/api/actual-client.js';
import { error, errorFromCatch, type MCPResponse } from '../core/response/index.js';
import type { ToolInput } from '../core/types/index.js';
// Account tools (non-CRUD)
import * as closeAccount from './accounts/close-account/index.js';
import * as getAccountBalance from './accounts/get-account-balance/index.js';
import * as reopenAccount from './accounts/reopen-account/index.js';
import * as balanceHistory from './balance-history/index.js';
import * as holdBudget from './budget/hold-budget/index.js';
import * as resetBudgetHold from './budget/reset-budget-hold/index.js';
import * as getBudget from './budgets/get-budget/index.js';
import * as getBudgets from './budgets/get-budgets/index.js';
import * as importTransactions from './budgets/import-transactions/index.js';
import * as switchBudget from './budgets/switch-budget/index.js';
import * as getGroupedCategories from './categories/get-grouped-categories/index.js';
// CRUD Factory
import { createCRUDTools } from './crud-factory.js';
import { entityConfigurations } from './crud-factory-config.js';
import * as financialInsights from './financial-insights/index.js';
import * as getAccounts from './get-accounts/index.js';
import * as getTransactions from './get-transactions/index.js';
import * as monthlySummary from './monthly-summary/index.js';
import * as getPayees from './payees/get-payees/index.js';
// Payee tools
import * as mergePayees from './payees/merge-payees/index.js';
import * as getRules from './rules/get-rules/index.js';
// Budget operation tools
import * as setBudget from './set-budget/index.js';
import * as spendingByCategory from './spending-by-category/index.js';
// Transaction CRUD tools
import * as createTransaction from './transactions/create-transaction/index.js';
import * as deleteTransaction from './transactions/delete-transaction/index.js';
import * as updateTransaction from './transactions/update-transaction/index.js';

/**
 * Tool definition interface for registry-based tool management
 */
export interface ToolDefinition {
  schema: {
    name: string;
    description?: string;
    inputSchema: ToolInput;
  };
  handler: (args: Record<string, unknown>) => Promise<MCPResponse>;
  requiresWrite: boolean;
}

/**
 * Tool category for feature flag filtering
 */
type ToolCategory = 'core' | 'nini';

/**
 * Extended tool definition with category for feature flag filtering
 */
interface CategorizedToolDefinition {
  schema: {
    name: string;
    description?: string;
    inputSchema: ToolInput;
  };
  handler: (args: Record<string, unknown>) => Promise<MCPResponse>;
  requiresWrite: boolean;
  category: ToolCategory;
}

// Generate CRUD tools using factory for all entity types
const categoryCRUDTools = createCRUDTools(entityConfigurations.category);
const payeeCRUDTools = createCRUDTools(entityConfigurations.payee);
const accountCRUDTools = createCRUDTools(entityConfigurations.account);
const ruleCRUDTools = createCRUDTools(entityConfigurations.rule);
const categoryGroupCRUDTools = createCRUDTools(entityConfigurations.categoryGroup);

/**
 * Centralized tool registry with metadata
 * All tools are registered here with their schema, handler, permission requirements, and category
 */
const toolRegistry: CategorizedToolDefinition[] = [
  // Core read-only tools
  {
    schema: getTransactions.schema,
    handler: getTransactions.handler,
    requiresWrite: false,
    category: 'core',
  },
  {
    schema: spendingByCategory.schema,
    handler: spendingByCategory.handler,
    requiresWrite: false,
    category: 'core',
  },
  {
    schema: monthlySummary.schema,
    handler: monthlySummary.handler,
    requiresWrite: false,
    category: 'core',
  },
  {
    schema: financialInsights.schema,
    handler: financialInsights.handler,
    requiresWrite: false,
    category: 'core',
  },
  {
    schema: balanceHistory.schema,
    handler: balanceHistory.handler,
    requiresWrite: false,
    category: 'core',
  },
  {
    schema: getAccounts.schema,
    handler: getAccounts.handler,
    requiresWrite: false,
    category: 'core',
  },
  {
    schema: getGroupedCategories.schema,
    handler: getGroupedCategories.handler,
    requiresWrite: false,
    category: 'core',
  },
  {
    schema: getPayees.schema,
    handler: getPayees.handler,
    requiresWrite: false,
    category: 'core',
  },
  {
    schema: getRules.schema,
    handler: getRules.handler,
    requiresWrite: false,
    category: 'core',
  },

  // Core write tools
  {
    schema: setBudget.schema,
    handler: setBudget.handler,
    requiresWrite: true,
    category: 'core',
  },
  {
    schema: mergePayees.schema,
    handler: mergePayees.handler,
    requiresWrite: true,
    category: 'core',
  },
  {
    schema: importTransactions.schema,
    handler: importTransactions.handler,
    requiresWrite: true,
    category: 'core',
  },

  // Transaction CRUD tools
  {
    schema: createTransaction.schema,
    handler: createTransaction.handler,
    requiresWrite: true,
    category: 'core',
  },
  {
    schema: updateTransaction.schema,
    handler: updateTransaction.handler,
    requiresWrite: true,
    category: 'core',
  },
  {
    schema: deleteTransaction.schema,
    handler: deleteTransaction.handler,
    requiresWrite: true,
    category: 'core',
  },

  // Account tools (non-CRUD)
  {
    schema: closeAccount.schema,
    handler: closeAccount.handler,
    requiresWrite: true,
    category: 'nini',
  },
  {
    schema: reopenAccount.schema,
    handler: reopenAccount.handler,
    requiresWrite: true,
    category: 'nini',
  },
  {
    schema: getAccountBalance.schema,
    handler: getAccountBalance.handler,
    requiresWrite: false,
    category: 'core',
  },

  // Factory-generated CRUD tools for all entity types
  ...categoryCRUDTools,
  ...payeeCRUDTools,
  ...accountCRUDTools,
  ...ruleCRUDTools,
  ...categoryGroupCRUDTools,

  // Budget tools
  {
    schema: getBudget.schema,
    handler: getBudget.handler,
    requiresWrite: false,
    category: 'core',
  },
  {
    schema: holdBudget.schema,
    handler: holdBudget.handler,
    requiresWrite: true,
    category: 'nini',
  },
  {
    schema: resetBudgetHold.schema,
    handler: resetBudgetHold.handler,
    requiresWrite: true,
    category: 'nini',
  },

  // Budget file management (nini-only features for advanced users)
  {
    schema: getBudgets.schema,
    handler: getBudgets.handler,
    requiresWrite: false,
    category: 'nini',
  },
  {
    schema: switchBudget.schema,
    handler: switchBudget.handler,
    requiresWrite: true,
    category: 'nini',
  },
];

/**
 * Get available tools based on write permission and feature flags.
 * Filters the tool registry to return only tools that match the current permission level
 * and enabled feature flags.
 *
 * @param enableWrite - Whether write operations are enabled
 * @param enableNini - Whether nini (advanced) features are enabled
 * @returns Array of tool definitions available for the current permission level and enabled features
 */
export function getAvailableTools(enableWrite: boolean, enableNini: boolean): ToolDefinition[] {
  return toolRegistry.filter((tool) => {
    // Filter by write permission
    if (tool.requiresWrite && !enableWrite) {
      return false;
    }

    // Filter by nini category
    if (tool.category === 'nini' && !enableNini) {
      return false;
    }

    return true;
  });
}

/**
 * Setup MCP tool handlers on the server.
 * Registers list-tools and call-tool request handlers with the MCP server,
 * filtering available tools based on permissions and feature flags.
 *
 * @param server - The MCP server instance to register handlers on
 * @param enableWrite - Whether write operations are enabled (filters write-only tools)
 * @param enableNini - Whether nini (advanced) features are enabled (filters nini-category tools)
 */
export const setupTools = (server: Server, enableWrite: boolean, enableNini = false): void => {
  const availableTools = getAvailableTools(enableWrite, enableNini);

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
    try {
      await initActualApi();
      const { name, arguments: args } = request.params;

      // Find tool in registry
      const tool = toolRegistry.find((t) => t.schema.name === name);

      if (!tool) {
        return error(
          `Unknown tool '${name}'`,
          'Call list-tools to inspect supported tool names before retrying this request.'
        );
      }

      // Check write permission
      if (tool.requiresWrite && !enableWrite) {
        return error(
          `Tool '${name}' requires write permission`,
          'Start the server with the --enable-write flag to enable write operations.'
        );
      }

      // Check nini category permission
      if (tool.category === 'nini' && !enableNini) {
        return error(
          `Tool '${name}' requires nini features to be enabled`,
          'Start the server with the --enable-nini flag to enable advanced features.'
        );
      }

      // Execute tool handler
      const result = await tool.handler(args);
      return result;
    } catch (err) {
      return errorFromCatch(err, {
        fallbackMessage: `Failed to execute tool ${request.params.name}`,
        suggestion:
          'Check the Actual Budget server logs and ensure the provided arguments match the tool schema before retrying.',
        tool: request.params.name,
        operation: 'tool_execution',
        args: request.params.arguments,
      });
    }
  });
};
