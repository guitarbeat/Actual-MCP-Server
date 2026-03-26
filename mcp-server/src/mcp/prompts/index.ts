import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getCurrentMonth } from '../../core/utils/current-month.js';

export interface PromptDefinition {
  name: string;
  description: string;
  argsSchema?: Record<string, z.ZodTypeAny>;
  buildMessages: (args: Record<string, string | undefined>) => Promise<{
    messages: Array<{
      role: 'user';
      content: { type: 'text'; text: string };
    }>;
  }>;
}

export const promptDefinitions: PromptDefinition[] = [
  {
    name: 'analyze-monthly-spending',
    description: 'Analyze spending for a specific month',
    argsSchema: {
      month: z.string().optional().describe('The month to analyze (YYYY-MM)'),
    },
    async buildMessages({ month }) {
      const resolvedMonth = month || getCurrentMonth();

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please analyze my spending for ${resolvedMonth}.
1. Use 'monthly-summary' to get the high-level numbers.
2. Use 'spending-by-category' to break it down.
3. Identify any major outliers or categories where I overspent.`,
            },
          },
        ],
      };
    },
  },
  {
    name: 'financial-health-check',
    description: 'Perform a comprehensive check of financial health (balances, recent trends)',
    async buildMessages() {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please perform a financial health check:
1. List all my account balances using 'get-accounts'.
2. Calculate my total net worth.
3. Check my spending trends for the last 3 months using 'balance-history' or summaries.
4. Give me a brief summary of my financial status.`,
            },
          },
        ],
      };
    },
  },
  {
    name: 'triage-uncategorized-transactions',
    description:
      'Audit uncategorized transactions, turn strong clusters into rule improvements, and leave ambiguous leftovers for manual cleanup',
    argsSchema: {
      accountId: z.string().optional().describe('Optional account name or ID to scope the audit'),
    },
    async buildMessages({ accountId }) {
      const scope = accountId ? ` for account ${accountId}` : '';

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please triage uncategorized transactions${scope}.
1. Run 'audit-uncategorized-transactions' first${accountId ? ` with {"accountId": "${accountId}"}` : ''}.
2. Review the grouped results for create-rule and update-rule opportunities.
3. Use existing rule tools to improve high-confidence payee or imported_payee categorization.
4. Leave ambiguous leftovers for manual cleanup with 'update-transaction'.
5. Summarize what was automated versus what still needs manual review.`,
            },
          },
        ],
      };
    },
  },
];

export function registerPrompts(server: McpServer): void {
  promptDefinitions.forEach((prompt) => {
    server.registerPrompt(
      prompt.name,
      {
        description: prompt.description,
        argsSchema: prompt.argsSchema,
      },
      async (args) => prompt.buildMessages(args as Record<string, string | undefined>),
    );
  });
}
