import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ACCOUNT_LIST_RESOURCES,
  handleAccountsResource,
} from '../../resources/account-resources.js';
import {
  ASSISTIVE_LIST_RESOURCES,
  handleAssistiveResource,
} from '../../resources/assistive-resources.js';
import { BUDGET_LIST_RESOURCES, handleBudgetsResource } from '../../resources/budget-resources.js';

export interface ResourceDefinition {
  name: string;
  uri: string;
  description: string;
  mimeType: string;
  kind: 'static' | 'template';
}

function firstValue(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const resourceDefinitions: ResourceDefinition[] = [
  {
    name: ACCOUNT_LIST_RESOURCES[0].name,
    uri: ACCOUNT_LIST_RESOURCES[0].uri,
    description: ACCOUNT_LIST_RESOURCES[0].description,
    mimeType: ACCOUNT_LIST_RESOURCES[0].mimeType,
    kind: 'static',
  },
  {
    name: BUDGET_LIST_RESOURCES[0].name,
    uri: BUDGET_LIST_RESOURCES[0].uri,
    description: BUDGET_LIST_RESOURCES[0].description,
    mimeType: BUDGET_LIST_RESOURCES[0].mimeType,
    kind: 'static',
  },
  {
    name: ASSISTIVE_LIST_RESOURCES[0].name,
    uri: ASSISTIVE_LIST_RESOURCES[0].uri,
    description: ASSISTIVE_LIST_RESOURCES[0].description,
    mimeType: ASSISTIVE_LIST_RESOURCES[0].mimeType,
    kind: 'static',
  },
  {
    name: ASSISTIVE_LIST_RESOURCES[1].name,
    uri: ASSISTIVE_LIST_RESOURCES[1].uri,
    description: ASSISTIVE_LIST_RESOURCES[1].description,
    mimeType: ASSISTIVE_LIST_RESOURCES[1].mimeType,
    kind: 'static',
  },
  {
    name: 'Account Overview',
    uri: 'actual://accounts/{accountId}',
    description: 'Provides balance, status, and metadata for a specific account.',
    mimeType: 'text/markdown',
    kind: 'template',
  },
  {
    name: 'Account Transactions',
    uri: 'actual://accounts/{accountId}/transactions',
    description: 'Shows recent transactions for an account across the default reporting window.',
    mimeType: 'text/markdown',
    kind: 'template',
  },
  {
    name: 'Monthly Budget',
    uri: 'actual://budgets/{month}',
    description: 'Detailed budget breakdown for a specific month (YYYY-MM format).',
    mimeType: 'text/markdown',
    kind: 'template',
  },
  {
    name: 'Monthly Health Dashboard',
    uri: 'actual://health/{month}',
    description: 'Budget health dashboard for a specific month (YYYY-MM format).',
    mimeType: 'text/markdown',
    kind: 'template',
  },
  {
    name: 'Payee Rules',
    uri: 'actual://payees/{payeeId}/rules',
    description: 'Show Actual Budget rules associated with a payee.',
    mimeType: 'text/markdown',
    kind: 'template',
  },
];

export function registerResources(server: McpServer): void {
  server.registerResource(
    ACCOUNT_LIST_RESOURCES[0].name,
    ACCOUNT_LIST_RESOURCES[0].uri,
    {
      description: ACCOUNT_LIST_RESOURCES[0].description,
      mimeType: ACCOUNT_LIST_RESOURCES[0].mimeType,
    },
    async (uri) => handleAccountsResource(uri.href, []),
  );

  server.registerResource(
    BUDGET_LIST_RESOURCES[0].name,
    BUDGET_LIST_RESOURCES[0].uri,
    {
      description: BUDGET_LIST_RESOURCES[0].description,
      mimeType: BUDGET_LIST_RESOURCES[0].mimeType,
    },
    async (uri) => handleBudgetsResource(uri.href, []),
  );

  server.registerResource(
    ASSISTIVE_LIST_RESOURCES[0].name,
    ASSISTIVE_LIST_RESOURCES[0].uri,
    {
      description: ASSISTIVE_LIST_RESOURCES[0].description,
      mimeType: ASSISTIVE_LIST_RESOURCES[0].mimeType,
    },
    async (uri) => handleAssistiveResource(uri.href, 'health', []),
  );

  server.registerResource(
    ASSISTIVE_LIST_RESOURCES[1].name,
    ASSISTIVE_LIST_RESOURCES[1].uri,
    {
      description: ASSISTIVE_LIST_RESOURCES[1].description,
      mimeType: ASSISTIVE_LIST_RESOURCES[1].mimeType,
    },
    async (uri) => handleAssistiveResource(uri.href, 'rules', []),
  );

  server.registerResource(
    'Account Overview',
    new ResourceTemplate('actual://accounts/{accountId}', { list: undefined }),
    {
      description: 'Provides balance, status, and metadata for a specific account.',
      mimeType: 'text/markdown',
    },
    async (uri, { accountId }) => handleAccountsResource(uri.href, [firstValue(accountId)]),
  );

  server.registerResource(
    'Account Transactions',
    new ResourceTemplate('actual://accounts/{accountId}/transactions', { list: undefined }),
    {
      description: 'Shows recent transactions for an account across the default reporting window.',
      mimeType: 'text/markdown',
    },
    async (uri, { accountId }) =>
      handleAccountsResource(uri.href, [firstValue(accountId), 'transactions']),
  );

  server.registerResource(
    'Monthly Budget',
    new ResourceTemplate('actual://budgets/{month}', { list: undefined }),
    {
      description: 'Detailed budget breakdown for a specific month (YYYY-MM format).',
      mimeType: 'text/markdown',
    },
    async (uri, { month }) => handleBudgetsResource(uri.href, [firstValue(month)]),
  );

  server.registerResource(
    'Monthly Health Dashboard',
    new ResourceTemplate('actual://health/{month}', { list: undefined }),
    {
      description: 'Budget health dashboard for a specific month (YYYY-MM format).',
      mimeType: 'text/markdown',
    },
    async (uri, { month }) => handleAssistiveResource(uri.href, 'health', [firstValue(month)]),
  );

  server.registerResource(
    'Payee Rules',
    new ResourceTemplate('actual://payees/{payeeId}/rules', { list: undefined }),
    {
      description: 'Show Actual Budget rules associated with a payee.',
      mimeType: 'text/markdown',
    },
    async (uri, { payeeId }) =>
      handleAssistiveResource(uri.href, 'payees', [firstValue(payeeId), 'rules']),
  );
}
