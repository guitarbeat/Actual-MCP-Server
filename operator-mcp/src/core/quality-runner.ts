import { existsSync } from "node:fs";
import { join } from "node:path";
import { runCommand } from "./subprocess.js";

export interface QualityRunResult {
  name: string;
  command: string[];
  ok: boolean;
  exitCode: number;
  stderrTail: string;
}

const STDERR_TAIL_LINES = 40;

function tailLines(text: string, maxLines: number): string {
  const lines = text.trimEnd().split("\n");
  if (lines.length <= maxLines) {
    return lines.join("\n");
  }
  return lines.slice(-maxLines).join("\n");
}

export async function runWorkspaceScript(
  repoRoot: string,
  name: string,
  args: string[],
): Promise<QualityRunResult> {
  const result = await runCommand(repoRoot, "pnpm", args, {
    timeoutMs: 600_000,
  });

  return {
    name,
    command: ["pnpm", ...args],
    ok: result.ok,
    exitCode: result.exitCode,
    stderrTail: tailLines(result.stderr || result.stdout, STDERR_TAIL_LINES),
  };
}

export async function runActualMcpQuality(
  repoRoot: string,
): Promise<QualityRunResult> {
  return runWorkspaceScript(repoRoot, "quality", [
    "--filter",
    "actual-mcp",
    "quality",
  ]);
}

export async function runActualMcpBuild(
  repoRoot: string,
): Promise<QualityRunResult> {
  return runWorkspaceScript(repoRoot, "build", [
    "--filter",
    "actual-mcp",
    "build",
  ]);
}

export async function runActualMcpTest(
  repoRoot: string,
): Promise<QualityRunResult> {
  return runWorkspaceScript(repoRoot, "test", [
    "--filter",
    "actual-mcp",
    "test",
  ]);
}

export async function runActualMcpStartupSmoke(
  repoRoot: string,
): Promise<QualityRunResult> {
  return runWorkspaceScript(repoRoot, "startup-smoke", [
    "--filter",
    "actual-mcp",
    "test:startup-smoke",
  ]);
}

export function getBuildArtifactStatus(repoRoot: string): {
  actualMcpBuild: boolean;
  operatorMcpBuild: boolean;
} {
  return {
    actualMcpBuild: existsSync(
      join(repoRoot, "mcp-server", "build", "index.js"),
    ),
    operatorMcpBuild: existsSync(
      join(repoRoot, "operator-mcp", "build", "index.js"),
    ),
  };
}
