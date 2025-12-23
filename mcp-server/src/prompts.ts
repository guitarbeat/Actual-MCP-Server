import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { GetPromptRequestSchema, ListPromptsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// ----------------------------
// PROMPTS
// ----------------------------

export const setupPrompts = (server: Server): void => {
  /**
   * Handler for listing available prompts
   */
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'analyze-monthly-spending',
          description: 'Analyze spending for a specific month',
          arguments: [
            {
              name: 'month',
              description: 'The month to analyze (YYYY-MM)',
              required: true,
            },
          ],
        },
        {
          name: 'financial-health-check',
          description: 'Perform a comprehensive check of financial health (balances, recent trends)',
        },
      ],
    };
  });

  /**
   * Handler for getting prompts
   */
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'analyze-monthly-spending') {
      const month = (args?.month as string) || new Date().toISOString().slice(0, 7);
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please analyze my spending for ${month}.
1. Use 'monthly-summary' to get the high-level numbers.
2. Use 'spending-by-category' to break it down.
3. Identify any major outliers or categories where I overspent.`,
            },
          },
        ],
      };
    }

    if (name === 'financial-health-check') {
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
    }

    throw new Error(`Unknown prompt: ${name}`);
  });
};
