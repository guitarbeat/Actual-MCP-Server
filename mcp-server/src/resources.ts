import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  type ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';
import { initActualApi } from './core/api/actual-client.js';
import {
  ACCOUNT_LIST_RESOURCES,
  ACCOUNT_RESOURCE_TEMPLATES,
  handleAccountsResource,
} from './resources/account-resources.js';
import {
  ASSISTIVE_LIST_RESOURCES,
  ASSISTIVE_RESOURCE_TEMPLATES,
  handleAssistiveResource,
} from './resources/assistive-resources.js';
import {
  BUDGET_LIST_RESOURCES,
  BUDGET_RESOURCE_TEMPLATES,
  handleBudgetsResource,
} from './resources/budget-resources.js';

export const RESOURCE_TEMPLATES = [
  ...ACCOUNT_RESOURCE_TEMPLATES,
  ...BUDGET_RESOURCE_TEMPLATES,
  ...ASSISTIVE_RESOURCE_TEMPLATES,
];

export const setupResources = (server: Server): void => {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    await initActualApi();
    return {
      resources: [...ACCOUNT_LIST_RESOURCES, ...BUDGET_LIST_RESOURCES, ...ASSISTIVE_LIST_RESOURCES],
    };
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return {
      resourceTemplates: RESOURCE_TEMPLATES,
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    await initActualApi();
    return handleResourceRequest(request.params.uri);
  });
};

async function handleResourceRequest(uri: string): Promise<ReadResourceResult> {
  const url = new URL(uri);
  const pathParts = url.pathname.split('/').filter(Boolean);

  if (url.hostname === 'accounts') {
    return handleAccountsResource(uri, pathParts);
  }

  if (url.hostname === 'budgets') {
    return handleBudgetsResource(uri, pathParts);
  }

  return handleAssistiveResource(uri, url.hostname, pathParts);
}
