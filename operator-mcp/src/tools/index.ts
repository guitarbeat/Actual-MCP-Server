import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OperatorRuntimeConfig } from "../core/config.js";
import {
  handleListFiles,
  handleReadFile,
  handleSearchCode,
  listFilesSchema,
  readFileSchema,
  searchCodeSchema,
} from "./files.js";
import {
  applyPendingSchema,
  discardPendingSchema,
  getPendingSchema,
  handleApplyPending,
  handleDiscardPending,
  handleGetPending,
  handleListPending,
  handleProposeFileChange,
  proposeFileChangeSchema,
} from "./pending.js";

export function registerOperatorTools(
  server: McpServer,
  config: OperatorRuntimeConfig,
): void {
  server.registerTool(
    "read-file",
    {
      title: "Read File",
      description:
        "Read a UTF-8 text file under OPERATOR_REPO_ROOT. Paths must match the operator allowlist.",
      inputSchema: readFileSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => handleReadFile(config, args as { path: string }),
  );

  server.registerTool(
    "list-files",
    {
      title: "List Files",
      description:
        "List files and directories under a repository-relative path.",
      inputSchema: listFilesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) =>
      handleListFiles(
        config,
        (args ?? {}) as {
          path?: string;
          maxDepth?: number;
          maxEntries?: number;
        },
      ),
  );

  server.registerTool(
    "search-code",
    {
      title: "Search Code",
      description:
        "Search repository text files with a regular expression pattern.",
      inputSchema: searchCodeSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) =>
      handleSearchCode(
        config,
        (args ?? {}) as { pattern: string; path?: string; maxMatches?: number },
      ),
  );

  server.registerTool(
    "propose-file-change",
    {
      title: "Propose File Change",
      description:
        "Stage a full-file replacement under .operator/pending with a unified diff. Does not modify tracked files until apply-pending.",
      inputSchema: proposeFileChangeSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async (args) =>
      handleProposeFileChange(
        config,
        args as { path: string; content: string },
      ),
  );

  server.registerTool(
    "list-pending",
    {
      title: "List Pending",
      description: "List staged file changes awaiting approval.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async () => handleListPending(config),
  );

  server.registerTool(
    "get-pending",
    {
      title: "Get Pending",
      description:
        "Fetch one staged change including full diff and proposed content.",
      inputSchema: getPendingSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => handleGetPending(config, args as { id: string }),
  );

  server.registerTool(
    "apply-pending",
    {
      title: "Apply Pending",
      description:
        "Apply approved staged changes to the repository. Requires --enable-apply and OPERATOR_APPROVAL_SECRET.",
      inputSchema: applyPendingSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async (args) =>
      handleApplyPending(
        config,
        args as { ids: string[]; approvalSecret: string },
      ),
  );

  server.registerTool(
    "discard-pending",
    {
      title: "Discard Pending",
      description: "Remove staged changes without modifying repository files.",
      inputSchema: discardPendingSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => handleDiscardPending(config, args as { ids: string[] }),
  );
}
