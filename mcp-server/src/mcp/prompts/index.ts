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
