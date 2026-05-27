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
import {
  gitCommitSchema,
  gitDiffSchema,
  gitLogSchema,
  gitPullSchema,
  gitPushSchema,
  gitRollbackSchema,
  handleGitCommit,
  handleGitDiff,
  handleGitLog,
  handleGitPull,
  handleGitPush,
  handleGitRollback,
  handleGitStatus,
} from "./git.js";
import {
  handleOperatorHealthCheck,
  handleRunBuild,
  handleRunQuality,
  handleRunQualityGate,
  handleRunStartupSmoke,
  handleRunTests,
  runQualityGateSchema,
} from "./quality.js";

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

  server.registerTool(
    "git-status",
    {
      title: "Git Status",
      description: "Show git status (porcelain) for OPERATOR_REPO_ROOT.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async () => handleGitStatus(config),
  );

  server.registerTool(
    "git-diff",
    {
      title: "Git Diff",
      description: "Show git diff for the repository or one allowlisted path.",
      inputSchema: gitDiffSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => handleGitDiff(config, (args ?? {}) as { path?: string }),
  );

  server.registerTool(
    "git-log",
    {
      title: "Git Log",
      description: "Show recent commit history (oneline).",
      inputSchema: gitLogSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => handleGitLog(config, (args ?? {}) as { count?: number }),
  );

  server.registerTool(
    "git-commit",
    {
      title: "Git Commit",
      description:
        "Create a git commit. Requires --enable-git-write and approvalSecret.",
      inputSchema: gitCommitSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async (args) =>
      handleGitCommit(
        config,
        args as { message: string; paths?: string[]; approvalSecret: string },
      ),
  );

  server.registerTool(
    "git-push",
    {
      title: "Git Push",
      description:
        "Push the current or specified branch. Requires --enable-git-push and approvalSecret. Never uses --force.",
      inputSchema: gitPushSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async (args) =>
      handleGitPush(
        config,
        args as { remote?: string; branch?: string; approvalSecret: string },
      ),
  );

  server.registerTool(
    "git-pull",
    {
      title: "Git Pull",
      description:
        "Fast-forward pull from origin. Requires --enable-git-write.",
      inputSchema: gitPullSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async (args) =>
      handleGitPull(
        config,
        (args ?? {}) as { remote?: string; branch?: string },
      ),
  );

  server.registerTool(
    "git-rollback",
    {
      title: "Git Rollback",
      description:
        "Hard reset HEAD~N commits. Requires --enable-git-write and approvalSecret.",
      inputSchema: gitRollbackSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async (args) =>
      handleGitRollback(
        config,
        args as { commits: number; approvalSecret: string },
      ),
  );

  server.registerTool(
    "run-quality",
    {
      title: "Run Quality",
      description: "Run pnpm --filter actual-mcp quality in the workspace.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async () => handleRunQuality(config),
  );

  server.registerTool(
    "run-build",
    {
      title: "Run Build",
      description: "Run pnpm --filter actual-mcp build in the workspace.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async () => handleRunBuild(config),
  );

  server.registerTool(
    "run-tests",
    {
      title: "Run Tests",
      description: "Run pnpm --filter actual-mcp test in the workspace.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async () => handleRunTests(config),
  );

  server.registerTool(
    "run-startup-smoke",
    {
      title: "Run Startup Smoke",
      description: "Run pnpm --filter actual-mcp test:startup-smoke.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async () => handleRunStartupSmoke(config),
  );

  server.registerTool(
    "run-quality-gate",
    {
      title: "Run Quality Gate",
      description:
        "Run quality, build, and test for actual-mcp. Optionally includes startup smoke.",
      inputSchema: runQualityGateSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) =>
      handleRunQualityGate(
        config,
        (args ?? {}) as { includeStartupSmoke?: boolean },
      ),
  );

  server.registerTool(
    "operator-health-check",
    {
      title: "Operator Health Check",
      description:
        "Report git status, pending changes, feature flags, and build artifact presence.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async () => handleOperatorHealthCheck(config),
  );
}
