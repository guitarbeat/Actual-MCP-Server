import { assertPathAllowed } from "./repo-jail.js";
import { runGit } from "./subprocess.js";

export class GitServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitServiceError";
  }
}

export interface CommandResultView {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

function toView(result: {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}): CommandResultView {
  return {
    ok: result.ok,
    exitCode: result.exitCode,
    stdout: result.stdout.trimEnd(),
    stderr: result.stderr.trimEnd(),
  };
}

export function assertAllowedBranch(
  branch: string,
  allowedPrefix?: string,
): void {
  if (!allowedPrefix) {
    return;
  }

  if (!branch.startsWith(allowedPrefix)) {
    throw new GitServiceError(
      `Branch "${branch}" must start with prefix "${allowedPrefix}"`,
    );
  }
}

export async function getCurrentBranch(repoRoot: string): Promise<string> {
  const result = await runGit(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!result.ok) {
    throw new GitServiceError(
      result.stderr || "Failed to resolve current branch",
    );
  }

  return result.stdout.trim();
}

export async function gitStatus(repoRoot: string): Promise<CommandResultView> {
  const result = await runGit(repoRoot, ["status", "--porcelain=v1", "-b"]);
  return toView(result);
}

export async function gitDiff(
  repoRoot: string,
  path?: string,
): Promise<CommandResultView> {
  const args = ["diff", "--no-color"];
  if (path) {
    args.push("--", path);
  }
  const result = await runGit(repoRoot, args);
  return toView(result);
}

export async function gitLog(
  repoRoot: string,
  count: number,
): Promise<CommandResultView> {
  const result = await runGit(repoRoot, [
    "log",
    `-n`,
    String(count),
    "--oneline",
    "--no-decorate",
  ]);
  return toView(result);
}

export async function gitCommit(
  repoRoot: string,
  options: {
    message: string;
    paths?: string[];
    allowedBranchPrefix?: string;
  },
): Promise<CommandResultView> {
  const branch = await getCurrentBranch(repoRoot);
  assertAllowedBranch(branch, options.allowedBranchPrefix);

  if (options.paths && options.paths.length > 0) {
    for (const path of options.paths) {
      assertPathAllowed(repoRoot, path);
    }
    const addResult = await runGit(repoRoot, ["add", "--", ...options.paths]);
    if (!addResult.ok) {
      return toView(addResult);
    }
  }

  const commitResult = await runGit(repoRoot, [
    "commit",
    "-m",
    options.message,
  ]);
  return toView(commitResult);
}

export async function gitPush(
  repoRoot: string,
  options: {
    remote?: string;
    branch?: string;
    allowedBranchPrefix?: string;
  },
): Promise<CommandResultView> {
  const branch = options.branch || (await getCurrentBranch(repoRoot));
  assertAllowedBranch(branch, options.allowedBranchPrefix);

  const remote = options.remote || "origin";
  const result = await runGit(repoRoot, ["push", remote, branch]);
  return toView(result);
}

export async function gitPull(
  repoRoot: string,
  options: { remote?: string; branch?: string },
): Promise<CommandResultView> {
  const branch = options.branch || (await getCurrentBranch(repoRoot));
  const remote = options.remote || "origin";
  const result = await runGit(repoRoot, ["pull", "--ff-only", remote, branch]);
  return toView(result);
}

export async function gitRollback(
  repoRoot: string,
  options: { commits: number; allowedBranchPrefix?: string },
): Promise<CommandResultView> {
  if (options.commits < 1 || options.commits > 20) {
    throw new GitServiceError("commits must be between 1 and 20");
  }

  const branch = await getCurrentBranch(repoRoot);
  assertAllowedBranch(branch, options.allowedBranchPrefix);

  const result = await runGit(repoRoot, [
    "reset",
    "--hard",
    `HEAD~${options.commits}`,
  ]);
  return toView(result);
}
