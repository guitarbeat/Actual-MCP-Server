import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { initActualApi } from '../../core/api/actual-client.js';
import { error, errorFromCatch } from '../../core/response/index.js';
import type { DeclarativeToolDefinition } from './common.js';
import { crudToolDefinitions } from './crud-tools.js';
import { readToolDefinitions } from './read-tools.js';
import { writeToolDefinitions } from './write-tools.js';

export const toolDefinitions: DeclarativeToolDefinition[] = [
  ...readToolDefinitions,
  ...writeToolDefinitions,
  ...crudToolDefinitions,
];

export function getToolDefinitions(options: {
  enableWrite: boolean;
  enableAdvanced: boolean;
}): DeclarativeToolDefinition[] {
  const { enableWrite, enableAdvanced } = options;

  return toolDefinitions.filter((tool) => {
    if (tool.requiresWrite && !enableWrite) {
      return false;
    }

    if (tool.category === 'advanced' && !enableAdvanced) {
      return false;
    }

    return true;
  });
}

export function registerTools(
  server: McpServer,
  options: { enableWrite: boolean; enableAdvanced: boolean },
): void {
  const availableTools = getToolDefinitions(options);

  server.server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: availableTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema ?? { type: 'object', properties: {} },
      })),
    };
  });

  server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      await initActualApi();
      const { name, arguments: args } = request.params;
      const tool = availableTools.find((candidate) => candidate.name === name);

      if (!tool) {
        return error(
          `Unknown tool '${name}'`,
          'Call list-tools to inspect supported tool names before retrying this request.',
        );
      }

      return await tool.execute((args ?? {}) as Record<string, unknown>);
    } catch (err) {
      return errorFromCatch(err, {
        fallbackMessage: `Failed to execute tool ${request.params.name}`,
        suggestion:
          'Check the Actual Budget server logs and ensure the provided arguments match the tool schema before retrying.',
        tool: request.params.name,
        operation: 'tool_execution',
        args: request.params.arguments,
      });
    }
  });
}
