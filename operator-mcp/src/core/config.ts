import { existsSync } from "node:fs";
import { resolve } from "node:path";

export interface OperatorRuntimeConfig {
  repoRoot: string;
  pendingDir: string;
  approvalSecret?: string;
  enableApply: boolean;
}

export function resolveRepoRoot(explicitRoot?: string): string {
  const candidate = resolve(
    explicitRoot || process.env.OPERATOR_REPO_ROOT || process.cwd(),
  );

  if (!existsSync(candidate)) {
    throw new Error(`OPERATOR_REPO_ROOT does not exist: ${candidate}`);
  }

  return candidate;
}

export function createOperatorConfig(options: {
  repoRoot?: string;
  approvalSecret?: string;
  enableApply: boolean;
}): OperatorRuntimeConfig {
  const repoRoot = resolveRepoRoot(options.repoRoot);

  return {
    repoRoot,
    pendingDir: resolve(repoRoot, ".operator", "pending"),
    approvalSecret:
      options.approvalSecret || process.env.OPERATOR_APPROVAL_SECRET,
    enableApply: options.enableApply,
  };
}
