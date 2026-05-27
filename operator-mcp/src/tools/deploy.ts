import { z } from "zod";
import type { OperatorRuntimeConfig } from "../core/config.js";
import { verifyApprovalSecret } from "../core/approval.js";
import { listDeployLogEntries } from "../core/deploy-log.js";
import { executeDeploy, prepareDeploy } from "../core/deploy-service.js";
import { GitServiceError } from "../core/git-service.js";
import {
  errorFromCatch,
  errorResult,
  successResult,
} from "../core/tool-result.js";

export const prepareDeploySchema = {
  remote: z.string().optional().describe('Remote name (default: "origin")'),
  branch: z
    .string()
    .optional()
    .describe("Branch to fast-forward (default: current branch)"),
};

export async function handlePrepareDeploy(
  config: OperatorRuntimeConfig,
  args: { remote?: string; branch?: string },
) {
  try {
    const result = await prepareDeploy(config, args);
    return successResult({ ...result });
  } catch (error) {
    if (error instanceof GitServiceError) {
      return errorResult(error.message);
    }
    return errorFromCatch(error, "Failed to prepare deploy");
  }
}

export const executeDeploySchema = {
  includeStartupSmoke: z
    .boolean()
    .optional()
    .describe("When true, runs actual-mcp test:startup-smoke after tests"),
  approvalSecret: z
    .string()
    .describe(
      "Must match OPERATOR_APPROVAL_SECRET configured on the operator server",
    ),
};

export async function handleExecuteDeploy(
  config: OperatorRuntimeConfig,
  args: { includeStartupSmoke?: boolean; approvalSecret: string },
) {
  if (!config.enableDeploy) {
    return errorResult(
      "execute-deploy is disabled. Restart the operator server with --enable-deploy.",
    );
  }

  const approvalError = verifyApprovalSecret(config, args.approvalSecret);
  if (approvalError) {
    return approvalError;
  }

  try {
    const result = await executeDeploy(config, {
      includeStartupSmoke: args.includeStartupSmoke,
    });
    return successResult({ ...result });
  } catch (error) {
    if (error instanceof GitServiceError) {
      return errorResult(error.message);
    }
    return errorFromCatch(error, "Failed to execute deploy verification");
  }
}

export const deployStatusSchema = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Number of recent deploy log entries to return"),
};

export async function handleDeployStatus(
  config: OperatorRuntimeConfig,
  args: { limit?: number },
) {
  const entries = await listDeployLogEntries(config, args.limit ?? 10);
  return successResult({
    count: entries.length,
    entries,
    logPath: config.deployLogPath,
  });
}
