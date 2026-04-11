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
import { TAG_LIST_RESOURCES, handleTagsResource } from '../../resources/tag-resources.js';
import {
  UNCATEGORIZED_LIST_RESOURCES,
  handleUncategorizedResource,
} from '../../resources/uncategorized-resources.js';

export interface ResourceDefinition {
  name: string;
  uri: string;
  description: string;
  mimeType: string;
  kind: 'static' | 'template';
}

interface TemplateResourceDefinition extends ResourceDefinition {
  kind: 'template';
  template: ResourceTemplate;
  handler: Parameters<McpServer['registerResource']>[3];
}

interface ListResourceDefinition {
  resource: {
    name: string;
    uri: string;
    description: string;
    mimeType: string;
  };
  handler: Parameters<McpServer['registerResource']>[3];
}

function firstValue(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

const ASSISTIVE_LIST_KIND_BY_URI: Record<string, 'health' | 'rules'> = {
  'actual://health': 'health',
  'actual://rules': 'rules',
};

const LIST_RESOURCES: ListResourceDefinition[] = [
  ...ACCOUNT_LIST_RESOURCES.map((resource) => ({
    resource,
    handler: async (uri) => handleAccountsResource(uri.href, []),
  })),
  ...BUDGET_LIST_RESOURCES.map((resource) => ({
    resource,
    handler: async (uri) => handleBudgetsResource(uri.href, []),
  })),
  ...ASSISTIVE_LIST_RESOURCES.map((resource) => {
    const assistiveKind = ASSISTIVE_LIST_KIND_BY_URI[resource.uri];
    if (!assistiveKind) {
      throw new Error(`Unknown assistive list resource: ${resource.uri}`);
    }

    return {
      resource,
      handler: async (uri) => handleAssistiveResource(uri.href, assistiveKind, []),
    };
  }),
  ...TAG_LIST_RESOURCES.map((resource) => ({
    resource,
    handler: async (uri) => handleTagsResource(uri.href),
  })),
  ...UNCATEGORIZED_LIST_RESOURCES.map((resource) => ({
    resource,
    handler: async (uri) => handleUncategorizedResource(uri.href),
  })),
];

const TEMPLATE_RESOURCES: TemplateResourceDefinition[] = [
  {
    name: 'Account Overview',
    uri: 'actual://accounts/{accountId}',
    description: 'Provides balance, status, and metadata for a specific account.',
    mimeType: 'text/markdown',
    kind: 'template',
    template: new ResourceTemplate('actual://accounts/{accountId}', { list: undefined }),
    handler: async (uri, { accountId }) =>
      handleAccountsResource(uri.href, [firstValue(accountId)]),
  },
  {
    name: 'Account Transactions',
    uri: 'actual://accounts/{accountId}/transactions',
    description: 'Shows recent transactions for an account across the default reporting window.',
    mimeType: 'text/markdown',
    kind: 'template',
    template: new ResourceTemplate('actual://accounts/{accountId}/transactions', {
      list: undefined,
    }),
    handler: async (uri, { accountId }) =>
      handleAccountsResource(uri.href, [firstValue(accountId), 'transactions']),
  },
  {
    name: 'Monthly Budget',
    uri: 'actual://budgets/{month}',
    description: 'Detailed budget breakdown for a specific month (YYYY-MM format).',
    mimeType: 'text/markdown',
    kind: 'template',
    template: new ResourceTemplate('actual://budgets/{month}', { list: undefined }),
    handler: async (uri, { month }) => handleBudgetsResource(uri.href, [firstValue(month)]),
  },
  {
    name: 'Monthly Health Dashboard',
    uri: 'actual://health/{month}',
    description: 'Budget health dashboard for a specific month (YYYY-MM format).',
    mimeType: 'text/markdown',
    kind: 'template',
    template: new ResourceTemplate('actual://health/{month}', { list: undefined }),
    handler: async (uri, { month }) =>
      handleAssistiveResource(uri.href, 'health', [firstValue(month)]),
  },
  {
    name: 'Payee Rules',
    uri: 'actual://payees/{payeeId}/rules',
    description: 'Show Actual Budget rules associated with a payee.',
    mimeType: 'text/markdown',
    kind: 'template',
    template: new ResourceTemplate('actual://payees/{payeeId}/rules', { list: undefined }),
    handler: async (uri, { payeeId }) =>
      handleAssistiveResource(uri.href, 'payees', [firstValue(payeeId), 'rules']),
  },
];

export const resourceDefinitions: ResourceDefinition[] = [
  ...LIST_RESOURCES.map(({ resource }) => ({
    name: resource.name,
    uri: resource.uri,
    description: resource.description,
    mimeType: resource.mimeType,
    kind: 'static',
  })),
  ...TEMPLATE_RESOURCES.map(({ template: _template, handler: _handler, ...definition }) => ({
    ...definition,
  })),
];

export function registerResources(server: McpServer): void {
  LIST_RESOURCES.forEach(({ resource, handler }) => {
    server.registerResource(
      resource.name,
      resource.uri,
      {
        description: resource.description,
        mimeType: resource.mimeType,
      },
      handler,
    );
  });

  TEMPLATE_RESOURCES.forEach(({ name, template, description, mimeType, handler }) => {
    server.registerResource(
      name,
      template,
      {
        description,
        mimeType,
      },
      handler,
    );
  });
}
