import type { RuleEntity } from '@actual-app/api/@types/loot-core/src/types/models/rule.js';
import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import {
  getAccounts,
  getBudgetMonth,
  getPayeeRules,
  getRules,
} from '../core/api/actual-client.js';
import {
  type FinancialInsightsSummary,
  generateInsightsSummary,
} from '../core/analysis/financial-analyzer.js';
import { fetchAllPayeesMap } from '../core/data/fetch-payees.js';
import { formatAmount } from '../core/formatting/index.js';
import type { Account } from '../core/types/index.js';

interface CategoryData {
  name: string;
  budgeted?: number;
  spent?: number;
}

interface CategoryGroupData {
  is_income?: boolean;
  categories?: CategoryData[];
}

interface BudgetMonthData {
  categoryGroups?: CategoryGroupData[];
}

export const ASSISTIVE_RESOURCE_TEMPLATES = [
  {
    name: 'health-dashboard',
    title: 'Monthly Health Dashboard',
    uriTemplate: 'actual://health/{month}',
    description: 'Budget health dashboard for a specific month (YYYY-MM format).',
    mimeType: 'text/markdown',
  },
  {
    name: 'payee-rules',
    title: 'Payee Rules',
    uriTemplate: 'actual://payees/{payeeId}/rules',
    description: 'Show Actual Budget rules associated with a payee.',
    mimeType: 'text/markdown',
  },
];

export const ASSISTIVE_LIST_RESOURCES = [
  {
    uri: 'actual://health',
    name: 'Current Month Health Dashboard',
    description: 'High-level budget health dashboard for the current month.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'actual://rules',
    name: 'Rule Directory',
    description: 'Browse Actual Budget automation rules.',
    mimeType: 'text/markdown',
  },
];

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function categorizeAccounts(accounts: Account[]): {
  liquid: Account[];
  credit: Account[];
  investment: Account[];
} {
  const liquid: Account[] = [];
  const credit: Account[] = [];
  const investment: Account[] = [];

  accounts
    .filter((account) => !account.closed)
    .forEach((account) => {
      const type = (account.type || '').toLowerCase();

      if (type.includes('credit')) {
        credit.push(account);
        return;
      }

      if (
        account.offbudget ||
        type.includes('brokerage') ||
        type.includes('crypto') ||
        type.includes('retirement') ||
        type.includes('investment')
      ) {
        investment.push(account);
        return;
      }

      liquid.push(account);
    });

  return { liquid, credit, investment };
}

function formatAccountSection(title: string, accounts: Account[]): string {
  if (accounts.length === 0) {
    return `## ${title}\n\n_None_\n`;
  }

  const rows = accounts
    .map(
      (account) =>
        `| ${account.name} | ${formatAmount(account.balance || 0)} | ${account.type || 'Unknown'} |`,
    )
    .join('\n');

  return `## ${title}\n\n| Account | Balance | Type |\n|---------|---------|------|\n${rows}\n`;
}

function formatOverspending(insights: FinancialInsightsSummary): string {
  if (insights.overspending.length === 0) {
    return '## Overspending\n\n_None_\n';
  }

  const rows = insights.overspending
    .map(
      (item) =>
        `| ${item.groupName} | ${item.categoryName} | ${formatAmount(item.budgeted)} | ${formatAmount(
          item.spent,
        )} | ${formatAmount(item.overage)} |`,
    )
    .join('\n');

  return `## Overspending\n\n| Group | Category | Budgeted | Spent | Overage |\n|-------|----------|----------|-------|---------|\n${rows}\n`;
}

function formatUnbudgetedSpending(budgetData: BudgetMonthData): string {
  const unbudgeted = (budgetData.categoryGroups ?? [])
    .filter((group) => !group.is_income)
    .flatMap((group) =>
      (group.categories ?? []).filter(
        (category) => Math.abs(category.spent || 0) > 0 && (category.budgeted || 0) === 0,
      ),
    );

  if (unbudgeted.length === 0) {
    return '## Unbudgeted Spending\n\n_None_\n';
  }

  const rows = unbudgeted
    .map(
      (category) =>
        `| ${category.name} | ${formatAmount(Math.abs(category.spent || 0))} | ${formatAmount(
          category.budgeted || 0,
        )} |`,
    )
    .join('\n');

  return `## Unbudgeted Spending\n\n| Category | Spent | Budgeted |\n|----------|-------|----------|\n${rows}\n`;
}

function formatNetWorth(accounts: ReturnType<typeof categorizeAccounts>): string {
  const liquidAssets = accounts.liquid.reduce((sum, account) => sum + (account.balance || 0), 0);
  const creditDebt = accounts.credit.reduce((sum, account) => sum + (account.balance || 0), 0);
  const investments = accounts.investment.reduce((sum, account) => sum + (account.balance || 0), 0);
  const totalNetWorth = liquidAssets + creditDebt + investments;

  return `## Net Worth\n\n- Liquid assets: ${formatAmount(liquidAssets)}\n- Credit card debt: ${formatAmount(
    creditDebt,
  )}\n- Investments / off-budget: ${formatAmount(investments)}\n- Total net worth: ${formatAmount(
    totalNetWorth,
  )}\n`;
}

function formatHealthDashboard(
  month: string,
  insights: FinancialInsightsSummary,
  accounts: Account[],
  budgetData: BudgetMonthData,
): string {
  const categorizedAccounts = categorizeAccounts(accounts);
  const uncategorizedSummary =
    insights.uncategorized.count === 0
      ? '_None_'
      : `${insights.uncategorized.count} transactions totaling ${formatAmount(
          insights.uncategorized.totalAmount,
        )}. Top payees: ${insights.uncategorized.topPayees.join(', ') || 'Unknown'}`;

  return [
    `# Budget Health Dashboard: ${month}`,
    '',
    `Summary: ${insights.summary}`,
    '',
    `Spending trend: ${formatAmount(insights.trends.currentMonthSpending)} this month vs ${formatAmount(
      insights.trends.previousMonthSpending,
    )} last month (${insights.trends.spendingChange.toFixed(1)}%).`,
    '',
    formatOverspending(insights),
    `## Uncategorized Transactions\n\n${uncategorizedSummary}\n`,
    formatUnbudgetedSpending(budgetData),
    formatAccountSection('Liquid Accounts', categorizedAccounts.liquid),
    formatAccountSection('Credit Accounts', categorizedAccounts.credit),
    formatAccountSection('Investments / Off-Budget', categorizedAccounts.investment),
    formatNetWorth(categorizedAccounts),
  ].join('\n');
}

function stringifyRulePart(part: RuleEntity['conditions'][number] | RuleEntity['actions'][number]): string {
  const value = Array.isArray(part.value) ? part.value.join(', ') : String(part.value);
  return `${String(part.field)} ${part.op} ${value}`;
}

function formatRulesMarkdown(title: string, rules: RuleEntity[]): string {
  if (rules.length === 0) {
    return `# ${title}\n\n_No rules found._`;
  }

  const rows = rules
    .map((rule) => {
      const conditions = (rule.conditions ?? []).map(stringifyRulePart).join('; ') || 'None';
      const actions = (rule.actions ?? []).map(stringifyRulePart).join('; ') || 'None';
      return `| ${rule.id} | ${rule.stage ?? 'default'} | ${conditions} | ${actions} |`;
    })
    .join('\n');

  return `# ${title}\n\n| ID | Stage | Conditions | Actions |\n|----|-------|------------|---------|\n${rows}`;
}

async function handleHealthResource(uri: string, month?: string): Promise<ReadResourceResult> {
  const targetMonth = month ?? getCurrentMonth();
  const [insights, accounts, budgetData] = await Promise.all([
    generateInsightsSummary(targetMonth),
    getAccounts(),
    getBudgetMonth(targetMonth) as Promise<BudgetMonthData>,
  ]);

  return {
    contents: [
      {
        uri,
        text: formatHealthDashboard(targetMonth, insights, accounts, budgetData),
        mimeType: 'text/markdown',
      },
    ],
  };
}

async function handleRulesResource(uri: string): Promise<ReadResourceResult> {
  const rules = await getRules();
  return {
    contents: [
      {
        uri,
        text: formatRulesMarkdown('Actual Budget Rules', rules),
        mimeType: 'text/markdown',
      },
    ],
  };
}

async function handlePayeeRulesResource(
  uri: string,
  payeeId: string,
): Promise<ReadResourceResult> {
  const [rules, payeesById] = await Promise.all([getPayeeRules(payeeId), fetchAllPayeesMap()]);
  const payeeName = payeesById[payeeId]?.name || payeeId;

  return {
    contents: [
      {
        uri,
        text: formatRulesMarkdown(`Rules For ${payeeName}`, rules),
        mimeType: 'text/markdown',
      },
    ],
  };
}

export async function handleAssistiveResource(
  uri: string,
  hostname: string,
  pathParts: string[],
): Promise<ReadResourceResult> {
  if (hostname === 'health') {
    if (pathParts.length === 0) {
      return handleHealthResource(uri);
    }

    if (pathParts.length === 1 && /^\d{4}-\d{2}$/.test(pathParts[0])) {
      return handleHealthResource(uri, pathParts[0]);
    }
  }

  if (hostname === 'rules' && pathParts.length === 0) {
    return handleRulesResource(uri);
  }

  if (hostname === 'payees' && pathParts.length === 2 && pathParts[1] === 'rules') {
    return handlePayeeRulesResource(uri, pathParts[0]);
  }

  return {
    contents: [
      { uri, text: `Error: Unrecognized resource URI: ${uri}`, mimeType: 'text/plain' },
    ],
  };
}
