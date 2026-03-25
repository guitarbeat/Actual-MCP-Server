import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolDefinition } from '../../tools/index.js';
import { getAvailableTools, setupTools } from '../../tools/index.js';
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
  enableNini: boolean;
}): DeclarativeToolDefinition[] {
  const legacyToolsByName = new Map(
    getAvailableTools(options.enableWrite, options.enableNini).map((tool) => [
      tool.schema.name,
      tool,
    ]),
  );
  const { enableWrite, enableNini } = options;

  return toolDefinitions
    .filter((tool) => {
      if (tool.requiresWrite && !enableWrite) {
        return false;
      }

      if (tool.category === 'nini' && !enableNini) {
        return false;
      }

      return true;
    })
    .map((tool) => mergeLegacySchema(tool, legacyToolsByName.get(tool.name)));
}

export function registerTools(
  server: McpServer,
  options: { enableWrite: boolean; enableNini: boolean },
): void {
  setupTools(server.server, options.enableWrite, options.enableNini);
}

function mergeLegacySchema(
  tool: DeclarativeToolDefinition,
  legacyTool?: ToolDefinition,
): DeclarativeToolDefinition {
  if (!legacyTool) {
    return tool;
  }

  return {
    ...tool,
    description: tool.description ?? legacyTool.schema.description,
    inputSchema: legacyTool.schema.inputSchema,
  };
}
