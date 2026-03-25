import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DeclarativeToolDefinition } from './common.js';
import { crudToolDefinitions } from './crud-tools.js';
import { readToolDefinitions } from './read-tools.js';
import { writeToolDefinitions } from './write-tools.js';

const toolDefinitions: DeclarativeToolDefinition[] = [
  ...readToolDefinitions,
  ...writeToolDefinitions,
  ...crudToolDefinitions,
];

export function registerTools(
  server: McpServer,
  options: { enableWrite: boolean; enableNini: boolean },
): void {
  const { enableWrite, enableNini } = options;

  toolDefinitions
    .filter((tool) => {
      if (tool.requiresWrite && !enableWrite) {
        return false;
      }

      if (tool.category === 'nini' && !enableNini) {
        return false;
      }

      return true;
    })
    .forEach((tool) => {
      server.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: tool.inputSchema,
        },
        async (args) => tool.execute((args ?? {}) as Record<string, unknown>),
      );
    });
}
