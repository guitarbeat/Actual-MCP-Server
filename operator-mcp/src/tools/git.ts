import { z } from "zod";
import type { OperatorRuntimeConfig } from "../core/config.js";
import { verifyApprovalSecret } from "../core/approval.js";
import {
  gitCommit,
  gitDiff,
  gitLog,
  gitPull,
  gitPush,
  gitRollback,
  gitStatus,
  GitServiceError,
} from "../core/git-service.js";
import { assertPathAllowed, RepoJailError } from "../core/repo-jail.js";
import {
  errorFromCatch,
  errorResult,
  successResult,
} from "../core/tool-result.js";

const approvalSecretSchema = z
  .string()
  .describe(
    "Must match OPERATOR_APPROVAL_SECRET configured on the operator server",
  );

export const gitDiffSchema = {
  path: z
    .string()
    .optional()
    .describe("Optional repository-relative path to limit the diff"),
};

export async function handleGitStatus(config: OperatorRuntimeConfig) {
  try {
    const result = await gitStatus(config.repoRoot);
    return successResult({
      ...result,
      branchPrefix: config.allowedBranchPrefix ?? null,
    });
  } catch (error) {
    return errorFromCatch(error, "Failed to read git status");
  }
}

export async function handleGitDiff(
  config: OperatorRuntimeConfig,
  args: { path?: string },
) {
  try {
    if (args.path) {
      assertPathAllowed(config.repoRoot, args.path);
    }
    const result = await gitDiff(config.repoRoot, args.path);
    return successResult({ ...result });
  } catch (error) {
    if (error instanceof RepoJailError) {
      return errorResult(error.message);
    }
    return errorFromCatch(error, "Failed to read git diff");
  }
}

export const gitLogSchema = {
  count: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Number of commits"),
};

export async function handleGitLog(
  config: OperatorRuntimeConfig,
  args: { count?: number },
) {
  try {
    const result = await gitLog(config.repoRoot, args.count ?? 10);
    return successResult({ ...result });
  } catch (error) {
    return errorFromCatch(error, "Failed to read git log");
  }
}

export const gitCommitSchema = {
  message: z.string().min(1).describe("Commit message"),
  paths: z
    .array(z.string())
    .optional()
    .describe(
      "Optional allowlisted paths to stage before commit. Omit to commit already-staged changes only.",
    ),
  approvalSecret: approvalSecretSchema,
};

export async function handleGitCommit(
  config: OperatorRuntimeConfig,
  args: { message: string; paths?: string[]; approvalSecret: string },
) {
  if (!config.enableGitWrite) {
    return errorResult(
      "git-commit is disabled. Restart the operator server with --enable-git-write.",
    );
  }

  const approvalError = verifyApprovalSecret(config, args.approvalSecret);
  if (approvalError) {
    return approvalError;
  }

  try {
    const result = await gitCommit(config.repoRoot, {
      message: args.message,
      paths: args.paths,
      allowedBranchPrefix: config.allowedBranchPrefix,
    });
    return successResult({ ...result });
  } catch (error) {
    if (error instanceof RepoJailError || error instanceof GitServiceError) {
      return errorResult(error.message);
    }
    return errorFromCatch(error, "Failed to create git commit");
  }
}

export const gitPushSchema = {
  remote: z.string().optional().describe('Remote name (default: "origin")'),
  branch: z
    .string()
    .optional()
    .describe("Branch to push (default: current branch)"),
  approvalSecret: approvalSecretSchema,
};

export async function handleGitPush(
  config: OperatorRuntimeConfig,
  args: { remote?: string; branch?: string; approvalSecret: string },
) {
  if (!config.enableGitPush) {
    return errorResult(
      "git-push is disabled. Restart with --enable-git-push after review.",
    );
  }

  const approvalError = verifyApprovalSecret(config, args.approvalSecret);
  if (approvalError) {
    return approvalError;
  }

  try {
    const result = await gitPush(config.repoRoot, {
      remote: args.remote,
      branch: args.branch,
      allowedBranchPrefix: config.allowedBranchPrefix,
    });
    return successResult({ ...result });
  } catch (error) {
    if (error instanceof GitServiceError) {
      return errorResult(error.message);
    }
    return errorFromCatch(error, "Failed to push");
  }
}

export const gitPullSchema = {
  remote: z.string().optional(),
  branch: z.string().optional(),
};

export async function handleGitPull(
  config: OperatorRuntimeConfig,
  args: { remote?: string; branch?: string },
) {
  if (!config.enableGitWrite) {
    return errorResult(
      "git-pull is disabled. Restart the operator server with --enable-git-write.",
    );
  }

  try {
    const result = await gitPull(config.repoRoot, args);
    return successResult({ ...result });
  } catch (error) {
    return errorFromCatch(error, "Failed to pull");
  }
}

export const gitRollbackSchema = {
  commits: z
    .number()
    .int()
    .min(1)
    .max(20)
    .describe("Number of commits to remove with hard reset"),
  approvalSecret: approvalSecretSchema,
};

export async function handleGitRollback(
  config: OperatorRuntimeConfig,
  args: { commits: number; approvalSecret: string },
) {
  if (!config.enableGitWrite) {
    return errorResult(
      "git-rollback is disabled. Restart the operator server with --enable-git-write.",
    );
  }

  const approvalError = verifyApprovalSecret(config, args.approvalSecret);
  if (approvalError) {
    return approvalError;
  }

  try {
    const result = await gitRollback(config.repoRoot, {
      commits: args.commits,
      allowedBranchPrefix: config.allowedBranchPrefix,
    });
    return successResult({ ...result });
  } catch (error) {
    if (error instanceof GitServiceError) {
      return errorResult(error.message);
    }
    return errorFromCatch(error, "Failed to rollback");
  }
}
