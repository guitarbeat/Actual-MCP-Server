import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { initActualApi } from '../../core/api/actual-client.js';
import { errorFromCatch } from '../../core/response/index.js';
import { normalizeToolResult, type DeclarativeToolDefinition } from './common.js';
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

  availableTools.forEach((tool) => {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.sdkInputSchema,
        annotations: tool.annotations,
      },
      async (args) => {
        try {
          await initActualApi();
          const result = await tool.execute((args ?? {}) as Record<string, unknown>);
          return normalizeToolResult(tool, result);
        } catch (err) {
          return normalizeToolResult(
            tool,
            errorFromCatch(err, {
              fallbackMessage: `Failed to execute tool ${tool.name}`,
              suggestion:
                'Check the Actual Budget server logs and ensure the provided arguments match the tool schema before retrying.',
              tool: tool.name,
              operation: 'tool_execution',
              args,
            }),
          );
        }
      },
    );
  });
}
