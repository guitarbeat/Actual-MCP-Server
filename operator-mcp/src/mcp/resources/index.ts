import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAllowPrefixes } from "../../core/repo-jail.js";
import { listPendingRecords } from "../../core/pending-store.js";
import type { OperatorRuntimeConfig } from "../../core/config.js";

export function registerOperatorResources(
  server: McpServer,
  config: OperatorRuntimeConfig,
): void {
  server.registerResource(
    "operator-constraints",
    "operator://constraints",
    {
      title: "Operator Constraints",
      description:
        "Path allowlist and runtime flags for the operator MCP server.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "operator://constraints",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              repoRoot: config.repoRoot,
              allowPrefixes: getAllowPrefixes(),
              enableApply: config.enableApply,
              enableGitWrite: config.enableGitWrite,
              enableGitPush: config.enableGitPush,
              enableDeploy: config.enableDeploy,
              deployLogPath: config.deployLogPath,
              allowedBranchPrefix: config.allowedBranchPrefix ?? null,
              hasApprovalSecret: Boolean(config.approvalSecret),
            },
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerResource(
    "operator-pending",
    "operator://pending",
    {
      title: "Operator Pending Changes",
      description: "Summary of staged file changes.",
      mimeType: "application/json",
    },
    async () => {
      const pending = await listPendingRecords(config.pendingDir);
      return {
        contents: [
          {
            uri: "operator://pending",
            mimeType: "application/json",
            text: JSON.stringify({ count: pending.length, pending }, null, 2),
          },
        ],
      };
    },
  );
}
