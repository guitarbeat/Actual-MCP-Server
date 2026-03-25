import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpServer as ActualMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerPrompts } from '../mcp/prompts/index.js';
import { registerResources } from '../mcp/resources/index.js';
import { registerTools } from '../mcp/tools/index.js';

export function createActualMcpServer(options: {
  version: string;
  enableWrite: boolean;
  enableNini: boolean;
}): McpServer {
  const server = new ActualMcpServer(
    {
      name: 'Actual Budget',
      version: options.version,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
        logging: {},
      },
    },
  );

  registerResources(server);
  registerPrompts(server);
  registerTools(server, {
    enableWrite: options.enableWrite,
    enableNini: options.enableNini,
  });

  return server;
}
