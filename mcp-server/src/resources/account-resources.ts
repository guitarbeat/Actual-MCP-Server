import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import {
  getAccountBalance,
  getAccounts,
  getTransactions,
} from '../core/api/actual-client.js';
import { formatAmount, formatDate, getDateRange } from '../core/formatting/index.js';
import type { Account, Transaction } from '../core/types/index.js';

export const ACCOUNT_RESOURCE_TEMPLATES = [
  {
    name: 'accounts-directory',
    title: 'Account Directory',
    uriTemplate: 'actual://accounts',
    description: 'Lists all accounts with balance, status, and budget placement.',
    mimeType: 'text/markdown',
  },
  {
    name: 'account-overview',
    title: 'Account Overview',
    uriTemplate: 'actual://accounts/{accountId}',
    description: 'Provides balance, status, and metadata for a specific account.',
    mimeType: 'text/markdown',
  },
  {
    name: 'account-transactions',
    title: 'Account Transactions',
    uriTemplate: 'actual://accounts/{accountId}/transactions',
    description: 'Shows recent transactions for an account across the default reporting window.',
    mimeType: 'text/markdown',
  },
];

export const ACCOUNT_LIST_RESOURCES = [
  {
    uri: 'actual://accounts',
    name: 'Accounts Directory',
    description:
      'Browse all accounts. Use the get-accounts tool for detailed account information and balances.',
    mimeType: 'text/markdown',
  },
];

async function handleAccountsDirectory(uri: string): Promise<ReadResourceResult> {
  const accounts: Account[] = await getAccounts();
  const accountsText = accounts
    .map((account) => {
      const closed = account.closed ? ' (CLOSED)' : '';
      const offBudget = account.offbudget ? ' (OFF BUDGET)' : '';
      const balance = account.balance !== undefined ? ` - ${formatAmount(account.balance)}` : '';

      return `- ${account.name}${closed}${offBudget}${balance} [ID: ${account.id}]`;
    })
    .join('\n');

  return {
    contents: [
      {
        uri,
        text: `# Actual Budget Accounts\n\n${accountsText}\n\nTotal Accounts: ${accounts.length}`,
        mimeType: 'text/markdown',
      },
    ],
  };
}

async function handleAccountOverview(uri: string, accountId: string): Promise<ReadResourceResult> {
  const accounts: Account[] = await getAccounts();
  const account = accounts.find((candidate) => candidate.id === accountId);

  if (!account) {
    return {
      contents: [
        {
          uri,
          text: `Error: Account with ID ${accountId} not found`,
          mimeType: 'text/plain',
        },
      ],
    };
  }

  const balance = await getAccountBalance(accountId);
  const details = `# Account: ${account.name}

ID: ${account.id}
Type: ${account.type || 'Unknown'}
Balance: ${formatAmount(balance)}
On Budget: ${!account.offbudget}
Status: ${account.closed ? 'Closed' : 'Open'}

To view transactions for this account, use the get-transactions tool.`;

  return {
    contents: [
      {
        uri,
        text: details,
        mimeType: 'text/markdown',
      },
    ],
  };
}

async function handleAccountTransactions(
  uri: string,
  accountId: string,
): Promise<ReadResourceResult> {
  const { startDate, endDate } = getDateRange();
  const transactions: Transaction[] = await getTransactions(accountId, startDate, endDate);

  if (transactions.length === 0) {
    return {
      contents: [
        {
          uri,
          text: `No transactions found for account ID ${accountId} between ${startDate} and ${endDate}`,
          mimeType: 'text/plain',
        },
      ],
    };
  }

  const header =
    '| Date | Payee | Category | Amount | Notes |\n| ---- | ----- | -------- | ------ | ----- |\n';
  const rows = transactions
    .map((transaction) => {
      const payee = transaction.payee_name || '(No payee)';
      const category = transaction.category_name || '(Uncategorized)';
      const notes = transaction.notes || '';

      return `| ${formatDate(transaction.date)} | ${payee} | ${category} | ${formatAmount(
        transaction.amount,
      )} | ${notes} |`;
    })
    .join('\n');

  return {
    contents: [
      {
        uri,
        text: `# Transactions for Account\n\nTime period: ${startDate} to ${endDate}\nTotal Transactions: ${transactions.length}\n\n${header}${rows}`,
        mimeType: 'text/markdown',
      },
    ],
  };
}

export async function handleAccountsResource(
  uri: string,
  pathParts: string[],
): Promise<ReadResourceResult> {
  if (pathParts.length === 0) {
    return handleAccountsDirectory(uri);
  }

  if (pathParts.length === 1) {
    return handleAccountOverview(uri, pathParts[0]);
  }

  if (pathParts.length === 2 && pathParts[1] === 'transactions') {
    return handleAccountTransactions(uri, pathParts[0]);
  }

  return {
    contents: [
      { uri, text: `Error: Unrecognized account resource: ${uri}`, mimeType: 'text/plain' },
    ],
  };
}
