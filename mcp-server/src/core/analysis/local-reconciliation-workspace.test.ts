import { describe, it, expect } from 'vitest';
import { resolve, sep } from 'node:path';
import {
  resolveLocalReconciliationWorkspaceRoot,
  resolveLocalReconciliationPath,
} from './local-reconciliation-workspace.js';

describe('local-reconciliation-workspace', () => {
  it('resolveLocalReconciliationWorkspaceRoot resolves correctly with custom root', () => {
    const customRoot = '/my/custom/repo/root';
    const expected = resolve(customRoot, '.local-reconciliation');
    expect(resolveLocalReconciliationWorkspaceRoot(customRoot)).toBe(expected);
  });

  it('resolveLocalReconciliationWorkspaceRoot resolves correctly with default root', () => {
    const result = resolveLocalReconciliationWorkspaceRoot();
    expect(result.endsWith('.local-reconciliation')).toBe(true);
  });

  it('resolveLocalReconciliationPath resolves segment with custom root', () => {
    const customRoot = '/my/custom/repo/root';
    const segment = 'test-file.json';
    const expected = resolve(customRoot, '.local-reconciliation', segment);
    expect(resolveLocalReconciliationPath(segment, customRoot)).toBe(expected);
  });

  it('resolveLocalReconciliationPath resolves segment with default root', () => {
    const segment = 'test-file.json';
    const result = resolveLocalReconciliationPath(segment);
    expect(result.endsWith(`.local-reconciliation${sep}${segment}`)).toBe(true);
  });
});
