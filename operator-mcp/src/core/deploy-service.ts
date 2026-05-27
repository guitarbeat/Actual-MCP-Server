import type { OperatorRuntimeConfig } from "./config.js";
import { appendDeployLogEntry } from "./deploy-log.js";
import {
  assertAllowedBranch,
  getCurrentBranch,
  gitFetch,
  gitMergeAbort,
  gitPull,
  gitStashIfDirty,
  gitStatus,
  GitServiceError,
  isWorkingTreeDirty,
} from "./git-service.js";
import {
  runActualMcpBuild,
  runActualMcpQuality,
  runActualMcpStartupSmoke,
  runActualMcpTest,
  type QualityRunResult,
} from "./quality-runner.js";

export interface PrepareDeployResult {
  ok: boolean;
  branch: string;
  remote: string;
  stashed: boolean;
  stashMessage?: string;
  statusBefore: string;
  statusAfter: string;
  logId: string;
  message: string;
}

export interface ExecuteDeployResult {
  ok: boolean;
  steps: QualityRunResult[];
  logId: string;
  restartRequired: boolean;
  message: string;
}

export async function prepareDeploy(
  config: OperatorRuntimeConfig,
  options: { remote?: string; branch?: string },
): Promise<PrepareDeployResult> {
  if (!config.enableDeploy) {
    throw new GitServiceError(
      "prepare-deploy is disabled. Restart with --enable-deploy.",
    );
  }

  if (!config.enableGitWrite) {
    throw new GitServiceError(
      "prepare-deploy requires --enable-git-write for stash and pull.",
    );
  }

  const remote = options.remote || "origin";
  const branch = options.branch || (await getCurrentBranch(config.repoRoot));
  assertAllowedBranch(branch, config.allowedBranchPrefix);

  const statusBefore = (await gitStatus(config.repoRoot)).stdout;
  const stashMessage = `operator-prepare-deploy-${Date.now()}`;
  const stashResult = await gitStashIfDirty(config.repoRoot, stashMessage);

  const fetchResult = await gitFetch(config.repoRoot, remote);
  if (!fetchResult.ok) {
    const log = await appendDeployLogEntry(config, {
      phase: "prepare",
      ok: false,
      branch,
      remote,
      message: "git fetch failed",
      stashed: stashResult.stashed,
    });
    return {
      ok: false,
      branch,
      remote,
      stashed: stashResult.stashed,
      stashMessage: stashResult.stashed ? stashMessage : undefined,
      statusBefore,
      statusAfter: statusBefore,
      logId: log.id,
      message: fetchResult.stderr || "git fetch failed",
    };
  }

  const pullResult = await gitPull(config.repoRoot, { remote, branch });
  if (!pullResult.ok) {
    await gitMergeAbort(config.repoRoot);
    const statusAfter = (await gitStatus(config.repoRoot)).stdout;
    const log = await appendDeployLogEntry(config, {
      phase: "prepare",
      ok: false,
      branch,
      remote,
      message: "git pull --ff-only failed; merge aborted if applicable",
      stashed: stashResult.stashed,
    });
    return {
      ok: false,
      branch,
      remote,
      stashed: stashResult.stashed,
      stashMessage: stashResult.stashed ? stashMessage : undefined,
      statusBefore,
      statusAfter,
      logId: log.id,
      message: pullResult.stderr || "git pull failed",
    };
  }

  const statusAfter = (await gitStatus(config.repoRoot)).stdout;
  const log = await appendDeployLogEntry(config, {
    phase: "prepare",
    ok: true,
    branch,
    remote,
    message: stashResult.stashed
      ? "Prepared deploy: stashed local changes and fast-forwarded"
      : "Prepared deploy: fast-forwarded clean tree",
    stashed: stashResult.stashed,
  });

  return {
    ok: true,
    branch,
    remote,
    stashed: stashResult.stashed,
    stashMessage: stashResult.stashed ? stashMessage : undefined,
    statusBefore,
    statusAfter,
    logId: log.id,
    message: log.message,
  };
}

export async function executeDeploy(
  config: OperatorRuntimeConfig,
  options: { includeStartupSmoke?: boolean },
): Promise<ExecuteDeployResult> {
  if (!config.enableDeploy) {
    throw new GitServiceError(
      "execute-deploy is disabled. Restart with --enable-deploy.",
    );
  }

  const branch = await getCurrentBranch(config.repoRoot);
  const steps: QualityRunResult[] = [
    await runActualMcpQuality(config.repoRoot),
    await runActualMcpBuild(config.repoRoot),
    await runActualMcpTest(config.repoRoot),
  ];

  if (options.includeStartupSmoke) {
    steps.push(await runActualMcpStartupSmoke(config.repoRoot));
  }

  const ok = steps.every((step) => step.ok);
  const dirty = isWorkingTreeDirty((await gitStatus(config.repoRoot)).stdout);

  const message = ok
    ? "Deploy verification passed. Restart the operator or budget MCP process if required."
    : `Deploy verification failed at step "${steps.find((step) => !step.ok)?.name}".`;

  const log = await appendDeployLogEntry(config, {
    phase: "execute",
    ok,
    branch,
    message,
    steps,
    restartRequired: ok,
  });

  return {
    ok,
    steps,
    logId: log.id,
    restartRequired: ok,
    message: dirty
      ? `${message} Working tree has uncommitted changes.`
      : message,
  };
}
