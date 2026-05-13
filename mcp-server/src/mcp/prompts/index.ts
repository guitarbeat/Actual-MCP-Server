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
1. Run 'audit-historical-transfers' first${accountId ? ' and use the accountId only as a follow-up filter when you switch to uncategorized cleanup.' : ''}.
2. If there are safe strict candidates, use 'apply-historical-transfers' with explicit candidate IDs from that audit.
3. Run 'audit-uncategorized-transactions'${accountId ? ` with {"accountId": "${accountId}"}` : ''} after transfer cleanup.
4. Review the grouped results for create-rule and update-rule opportunities.
5. Use existing rule tools to improve high-confidence payee or imported_payee categorization.
6. Leave ambiguous leftovers for manual cleanup with 'update-transaction'.
7. Summarize what was automated as transfers, what was automated with rules, and what still needs manual review.`,
            },
          },
        ],
      };
    },
  },
  {
    name: 'monthly-budget-review',
    description:
      'Compare budget vs actual spending for one month then optionally request non-destructive replan hints (requires read tools).',
    argsSchema: {
      month: z
        .string()
        .optional()
        .describe('Budget month YYYY-MM (optional; agents may default to current month)'),
    },
    async buildMessages({ month }) {
      const m = month || getCurrentMonth();
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Monthly budget review for ${m}:
1. Use \`get-budget-month\` for ${m}.
2. Use \`spending-by-category\` for the same window to see actual spend.
3. Optionally call \`recommend-budget-plan\`—do NOT apply budgets unless the user confirms they want edits (then needs write tools).

Limits: summarize top variances first; defer full ledger pulls to narrower follow-up.`,
            },
          },
        ],
      };
    },
  },
  {
    name: 'reconcile-accounts-pass',
    description:
      'Structured pass to reconcile one account against a stated statement balance using write-aware tools.',
    argsSchema: {
      accountHint: z
        .string()
        .optional()
        .describe('Account name substring or UUID to focus reconciliation'),
    },
    async buildMessages({ accountHint }) {
      const balanceNotes =
        'Ask for the institution statement ending balance before calling reconcile-account.';

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Reconcile pass${accountHint ? ` (${accountHint})` : ''}:
1. \`get-accounts\` to resolve the target account UUID.
2. \`get-account-balance\` for current cleared/uncleared snapshot if helpful.
3. \`get-transactions\` with a tight date window and sane limit/ offset — sample recent rows before bulk pulls.
4. \`reconcile-account\` only after the user confirms the statement balance (${balanceNotes}).

Idempotency: never guess balances; reconcile writes are intentional — confirm with user.`,
            },
          },
        ],
      };
    },
  },
  {
    name: 'schedule-health-check',
    description:
      'Review recurring schedules against recent postings to detect drift or dormant rules (read-heavy).',
    async buildMessages() {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Schedule health check:
1. \`get-schedules\` for the full recurring list (paginate mentally: prioritize large / near-term).
2. For 1–2 suspect schedules use \`get-transactions\` with narrow date filters and pagination to confirm posting patterns.
3. Summarize anomalies (missing postings, duplicated amounts) without mutating.`,
            },
          },
        ],
      };
    },
  },
  {
    name: 'import-sync-checklist',
    description:
      'Safe checklist after bank import then validate with sampled transactions (requires written import tool).',
    async buildMessages() {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Import + validation checklist:
1. Confirm institution scope with the user—then call \`import-transactions\` once per institution batch they requested.
2. Use \`get-transactions\` with limit/offset newest-first sampling to sanity-check arrivals (watch duplicate payees).
3. If duplicates appear STOP and escalate—do NOT mass-delete without explicit confirmation.

Writes limited to imports the user explicitly asked for.`,
            },
          },
        ],
      };
    },
  },
  {
    name: 'historical-transfer-review',
    description:
      'Audit strict historical-transfer candidates then selectively apply ONLY explicit candidate IDs from the audit output.',
    async buildMessages() {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Historical transfers batch:
1. \`audit-historical-transfers\` → capture structured candidate identifiers.
2. \`apply-historical-transfers\` MUST pass only identifiers returned from step 1—never fabricate IDs.
3. Summarize rejected vs applied counts for the user.

If audit returns zero strict candidates STOP before apply.`,
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
