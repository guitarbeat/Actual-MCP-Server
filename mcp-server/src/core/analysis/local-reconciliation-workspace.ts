import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function repoRootFromModule(): string {
  return resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
}

export function resolveLocalReconciliationWorkspaceRoot(repoRoot = repoRootFromModule()): string {
  return resolve(repoRoot, '.local-reconciliation');
}

export function resolveLocalReconciliationPath(
  segment: string,
  repoRoot = repoRootFromModule(),
): string {
  return resolve(resolveLocalReconciliationWorkspaceRoot(repoRoot), segment);
}
