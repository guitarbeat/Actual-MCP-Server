import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createToolAnnotations, jsonSchemaToZodRawShape, normalizeToolResult } from './common.js';
import { getToolDefinitions, registerTools } from './index.js';

const { mockInitActualApi } = vi.hoisted(() => ({
  mockInitActualApi: vi.fn(),
}));

vi.mock('../../core/api/actual-client.js', () => ({
  initActualApi: mockInitActualApi,
}));

function getTool(name: string) {
  const tool = getToolDefinitions({ enableWrite: true, enableAdvanced: true }).find(
    (candidate) => candidate.name === name,
  );

  expect(tool).toBeDefined();
  return tool!;
}

interface RegisteredToolCapture {
  name: string;
  config: Record<string, unknown>;
  callback: (args?: Record<string, unknown>) => Promise<unknown>;
}

function createServerCapture(): { captures: RegisteredToolCapture[]; server: McpServer } {
  const captures: RegisteredToolCapture[] = [];
  const server = {
    registerTool: (
      name: string,
      config: Record<string, unknown>,
      callback: (args?: Record<string, unknown>) => Promise<unknown>,
    ) => {
      captures.push({ name, config, callback });
      return {};
    },
  } as unknown as McpServer;

  return { captures, server };
}

beforeEach(() => {
  mockInitActualApi.mockReset();
  mockInitActualApi.mockResolvedValue(undefined);
});

describe('getToolDefinitions', () => {
  it('exposes 16 tools by default', () => {
    expect(getToolDefinitions({ enableWrite: false, enableAdvanced: false })).toHaveLength(16);
  });

  it('exposes 46 tools with write enabled', () => {
    expect(getToolDefinitions({ enableWrite: true, enableAdvanced: false })).toHaveLength(46);
  });

  it('exposes 54 tools with write and advanced enabled', () => {
    expect(getToolDefinitions({ enableWrite: true, enableAdvanced: true })).toHaveLength(54);
  });

  it('preserves the legacy JSON schema and derives an SDK input schema', () => {
    const tool = getTool('get-accounts');
    const inputSchema = tool.inputSchema as {
      properties?: Record<string, unknown>;
      type?: string;
    };

    expect(inputSchema.type).toBe('object');
    expect(inputSchema.properties).toHaveProperty('accountId');
    expect(inputSchema.properties).toHaveProperty('includeClosed');
    expect(tool.sdkInputSchema).toHaveProperty('accountId');
    expect(tool.sdkInputSchema).toHaveProperty('includeClosed');
  });

  it('adds explicit safety annotations for read tools', () => {
    const tool = getTool('get-accounts');

    expect(tool.title).toBe('Get Accounts');
    expect(tool.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('marks additive writes as non-destructive and deletes as destructive', () => {
    expect(getTool('create-transaction').annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    });

    expect(getTool('delete-transaction').annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    });
  });
});

describe('jsonSchemaToZodRawShape', () => {
  it('resolves local refs and preserves required versus optional fields', () => {
    const shape = jsonSchemaToZodRawShape({
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        },
        endDate: {
          $ref: '#/properties/startDate',
        },
      },
      required: ['startDate'],
      additionalProperties: false,
    });

    expect(shape).toBeDefined();
    expect(shape?.startDate.safeParse('2026-04-11').success).toBe(true);
    expect(shape?.startDate.safeParse('04/11/2026').success).toBe(false);
    expect(shape?.endDate.safeParse(undefined).success).toBe(true);
    expect(shape?.endDate.safeParse('04/11/2026').success).toBe(false);
  });

  it('falls back safely for unsupported unions', () => {
    const shape = jsonSchemaToZodRawShape({
      type: 'object',
      properties: {
        value: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    });

    expect(shape?.value.safeParse('ok').success).toBe(true);
    expect(shape?.value.safeParse(42).success).toBe(true);
  });
});

describe('createToolAnnotations', () => {
  it('creates stable explicit hints for tool behavior', () => {
    expect(createToolAnnotations('get-accounts', false)).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });

    expect(createToolAnnotations('merge-payees', true)).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    });
  });
});

describe('normalizeToolResult', () => {
  it('projects legacy JSON text into structuredContent', () => {
    const result = normalizeToolResult(
      {
        name: 'get-accounts',
        title: 'Get Accounts',
        category: 'core',
      },
      {
        content: [{ type: 'text', text: '{"accounts":[{"id":"acc-1"}]}' }],
      },
    );

    expect(result.structuredContent).toEqual({
      data: {
        accounts: [{ id: 'acc-1' }],
      },
      tool: 'get-accounts',
      title: 'Get Accounts',
      category: 'core',
      ok: true,
    });
  });

  it('keeps the server envelope authoritative', () => {
    const result = normalizeToolResult(
      {
        name: 'financial-insights',
        title: 'Financial Insights',
        category: 'core',
      },
      {
        isError: true,
        content: [{ type: 'text', text: 'bad' }],
        structuredContent: {
          tool: 'wrong',
          title: 'Wrong',
          category: 'advanced',
          ok: true,
          score: 92,
        },
      },
    );

    expect(result.structuredContent).toEqual({
      tool: 'financial-insights',
      title: 'Financial Insights',
      category: 'core',
      ok: false,
      score: 92,
    });
  });

  it('projects legacy error payloads into structuredContent', () => {
    const result = normalizeToolResult(
      {
        name: 'create-transaction',
        title: 'Create Transaction',
        category: 'core',
      },
      {
        isError: true,
        content: [
          {
            type: 'text',
            text: '{"error":true,"message":"boom","suggestion":"retry later"}',
          },
        ],
      },
    );

    expect(result.structuredContent).toEqual({
      error: true,
      message: 'boom',
      suggestion: 'retry later',
      data: {
        error: true,
        message: 'boom',
        suggestion: 'retry later',
      },
      tool: 'create-transaction',
      title: 'Create Transaction',
      category: 'core',
      ok: false,
    });
  });
});

describe('registerTools', () => {
  it('registers the filtered tools through the SDK API', () => {
    const { captures, server } = createServerCapture();
    registerTools(server, { enableWrite: false, enableAdvanced: false });

    expect(captures).toHaveLength(16);
    expect(captures[0]?.config).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        annotations: expect.objectContaining({
          readOnlyHint: true,
        }),
      }),
    );
  });

  it('normalizes infrastructure failures into structured tool errors', async () => {
    mockInitActualApi.mockRejectedValueOnce(new Error('offline'));
    const { captures, server } = createServerCapture();
    registerTools(server, { enableWrite: false, enableAdvanced: false });

    const getAccounts = captures.find((capture) => capture.name === 'get-accounts');
    expect(getAccounts).toBeDefined();

    const result = (await getAccounts!.callback({})) as {
      isError?: boolean;
      structuredContent?: Record<string, unknown>;
    };

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      tool: 'get-accounts',
      title: 'Get Accounts',
      category: 'core',
      ok: false,
      error: true,
      message: 'offline',
    });
  });
});
