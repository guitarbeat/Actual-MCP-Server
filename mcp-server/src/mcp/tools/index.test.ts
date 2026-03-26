import { describe, expect, it } from 'vitest';
import { getToolDefinitions } from './index.js';

function getTool(name: string) {
  const tool = getToolDefinitions({ enableWrite: true, enableNini: true }).find(
    (candidate) => candidate.name === name,
  );

  expect(tool).toBeDefined();
  return tool!;
}

describe('getToolDefinitions', () => {
  it('exposes 14 tools by default', () => {
    expect(getToolDefinitions({ enableWrite: false, enableNini: false })).toHaveLength(15);
  });

  it('exposes 43 tools with write enabled', () => {
    expect(getToolDefinitions({ enableWrite: true, enableNini: false })).toHaveLength(44);
  });

  it('exposes 51 tools with write and nini enabled', () => {
    expect(getToolDefinitions({ enableWrite: true, enableNini: true })).toHaveLength(52);
  });

  it('preserves the legacy schema for read tools', () => {
    const tool = getTool('get-accounts');
    const inputSchema = tool.inputSchema as {
      properties?: Record<string, unknown>;
      type?: string;
    };

    expect(inputSchema.type).toBe('object');
    expect(inputSchema.properties).toHaveProperty('accountId');
    expect(inputSchema.properties).toHaveProperty('includeClosed');
  });

  it('preserves the legacy schema for CRUD tools', () => {
    const tool = getTool('create-category');
    const inputSchema = tool.inputSchema as {
      properties?: Record<string, unknown>;
      required?: string[];
    };

    expect(inputSchema.properties).toHaveProperty('name');
    expect(inputSchema.properties).toHaveProperty('groupId');
    expect(inputSchema.required).toEqual(expect.arrayContaining(['name', 'groupId']));
  });

  it('preserves the legacy schema for new tag tools', () => {
    const tool = getTool('create-tag');
    const inputSchema = tool.inputSchema as {
      properties?: Record<string, unknown>;
      required?: string[];
    };

    expect(inputSchema.properties).toHaveProperty('tag');
    expect(inputSchema.properties).toHaveProperty('color');
    expect(inputSchema.required).toEqual(expect.arrayContaining(['tag']));
  });

  it('preserves the legacy schema for uncategorized audit tools', () => {
    const tool = getTool('audit-uncategorized-transactions');
    const inputSchema = tool.inputSchema as {
      properties?: Record<string, unknown>;
    };

    expect(inputSchema.properties).toHaveProperty('accountId');
    expect(inputSchema.properties).toHaveProperty('groupLimit');
    expect(inputSchema.properties).toHaveProperty('samplePerGroup');
  });

  it('preserves the legacy schema for write tools with rich validation', () => {
    const tool = getTool('create-transaction');
    const inputSchema = tool.inputSchema as {
      properties?: Record<string, unknown>;
      required?: string[];
    };

    expect(inputSchema.properties).toHaveProperty('account');
    expect(inputSchema.properties).toHaveProperty('date');
    expect(inputSchema.properties).toHaveProperty('amount');
    expect(inputSchema.required).toEqual(expect.arrayContaining(['account', 'date', 'amount']));
  });
});
