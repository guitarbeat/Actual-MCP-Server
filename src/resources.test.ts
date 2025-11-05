import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { setupResources, RESOURCE_TEMPLATES } from './resources.js';
import { ListResourcesRequestSchema, ListResourceTemplatesRequestSchema } from '@modelcontextprotocol/sdk/types.js';

vi.mock('./actual-api.js', () => ({
  initActualApi: vi.fn(),
}));

vi.mock('./core/data/fetch-accounts.js', () => ({
  fetchAllAccounts: vi.fn(),
}));

const { initActualApi } = await import('./actual-api.js');
const { fetchAllAccounts } = await import('./core/data/fetch-accounts.js');

type RequestHandler = (request: unknown, extra?: unknown) => Promise<unknown>;

const getRequestHandler = (
  server: Server,
  schema: typeof ListResourcesRequestSchema | typeof ListResourceTemplatesRequestSchema
): RequestHandler => {
  const handlers = (server as unknown as { _requestHandlers: Map<string, RequestHandler> })._requestHandlers;
  const handler = handlers.get(schema.shape.method.value);
  if (!handler) {
    throw new Error(`Handler not registered for ${schema.shape.method.value}`);
  }
  return handler;
};

describe('setupResources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes resource templates for clients', async () => {
    const server = new Server({ name: 'test', version: '0.0.0' }, { capabilities: { resources: {} } });
    setupResources(server);

    const handler = getRequestHandler(server, ListResourceTemplatesRequestSchema);
    const result = (await handler({ method: 'resources/templates/list', params: {} })) as {
      resourceTemplates: typeof RESOURCE_TEMPLATES;
    };

    expect(result.resourceTemplates).toEqual(RESOURCE_TEMPLATES);
    const uriTemplates = result.resourceTemplates.map((template) => template.uriTemplate);
    expect(uriTemplates).toContain('actual://accounts');
    expect(uriTemplates).toContain('actual://accounts/{accountId}');
    expect(uriTemplates).toContain('actual://accounts/{accountId}/transactions');
  });

  it('lists accounts and root overview resource', async () => {
    const server = new Server({ name: 'test', version: '0.0.0' }, { capabilities: { resources: {} } });
    setupResources(server);

    const sampleAccount = {
      id: 'acc-1',
      name: 'Checking',
      type: 'checking',
      closed: false,
      offbudget: false,
      balance: 123_00,
    } as const;

    vi.mocked(fetchAllAccounts).mockResolvedValue([sampleAccount]);

    const handler = getRequestHandler(server, ListResourcesRequestSchema);
    const result = (await handler({ method: 'resources/list', params: {} })) as {
      resources: Array<{ uri: string; name: string; description?: string }>;
    };

    expect(initActualApi).toHaveBeenCalledTimes(1);
    expect(fetchAllAccounts).toHaveBeenCalledTimes(1);

    expect(result.resources.length).toBe(2);
    expect(result.resources[0].uri).toBe('actual://accounts');
    expect(result.resources[0].name).toBe('Accounts Overview');
    expect(result.resources[1].uri).toBe(`actual://accounts/${sampleAccount.id}`);
    expect(result.resources[1].name).toBe(sampleAccount.name);
  });
});
