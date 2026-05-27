import { z } from "zod";
import type { OperatorRuntimeConfig } from "../core/config.js";
import {
  getBuildArtifactStatus,
  runActualMcpBuild,
  runActualMcpQuality,
  runActualMcpStartupSmoke,
  runActualMcpTest,
} from "../core/quality-runner.js";
import { gitStatus, getCurrentBranch } from "../core/git-service.js";
import { listPendingRecords } from "../core/pending-store.js";
import { errorFromCatch, successResult } from "../core/tool-result.js";

export async function handleRunQuality(config: OperatorRuntimeConfig) {
  const result = await runActualMcpQuality(config.repoRoot);
  return successResult({ result, ok: result.ok });
}

export async function handleRunBuild(config: OperatorRuntimeConfig) {
  const result = await runActualMcpBuild(config.repoRoot);
  return successResult({ result, ok: result.ok });
}

export async function handleRunTests(config: OperatorRuntimeConfig) {
  const result = await runActualMcpTest(config.repoRoot);
  return successResult({ result, ok: result.ok });
}

export async function handleRunStartupSmoke(config: OperatorRuntimeConfig) {
  const result = await runActualMcpStartupSmoke(config.repoRoot);
  return successResult({ result, ok: result.ok });
}

export const runQualityGateSchema = {
  includeStartupSmoke: z
    .boolean()
    .optional()
    .describe("When true, also runs actual-mcp test:startup-smoke after build"),
};

export async function handleRunQualityGate(
  config: OperatorRuntimeConfig,
  args: { includeStartupSmoke?: boolean },
) {
  const steps = [
    await runActualMcpQuality(config.repoRoot),
    await runActualMcpBuild(config.repoRoot),
    await runActualMcpTest(config.repoRoot),
  ];

  if (args.includeStartupSmoke) {
    steps.push(await runActualMcpStartupSmoke(config.repoRoot));
  }

  const ok = steps.every((step) => step.ok);
  return successResult({ steps, ok });
}

export async function handleOperatorHealthCheck(config: OperatorRuntimeConfig) {
  try {
    const [status, pending, branch] = await Promise.all([
      gitStatus(config.repoRoot),
      listPendingRecords(config.pendingDir),
      getCurrentBranch(config.repoRoot),
    ]);

    return successResult({
      ok: status.ok,
      branch,
      gitStatus: status.stdout,
      pendingCount: pending.length,
      flags: {
        enableApply: config.enableApply,
        enableGitWrite: config.enableGitWrite,
        enableGitPush: config.enableGitPush,
        enableDeploy: config.enableDeploy,
        allowedBranchPrefix: config.allowedBranchPrefix ?? null,
      },
      artifacts: getBuildArtifactStatus(config.repoRoot),
    });
  } catch (error) {
    return errorFromCatch(error, "Failed to collect operator health");
  }
}
