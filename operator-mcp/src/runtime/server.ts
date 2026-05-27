import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OperatorRuntimeConfig } from "../core/config.js";
import { registerOperatorResources } from "../mcp/resources/index.js";
import { registerOperatorTools } from "../tools/index.js";

export function createOperatorMcpServer(options: {
  version: string;
  config: OperatorRuntimeConfig;
}): McpServer {
  const server = new McpServer(
    {
      name: "actual-mcp-operator",
      version: options.version,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    },
  );

  registerOperatorResources(server, options.config);
  registerOperatorTools(server, options.config);

  return server;
}
