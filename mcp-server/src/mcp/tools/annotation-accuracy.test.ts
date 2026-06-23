import { describe, expect, it } from 'vitest';
import { getToolDefinitions } from './index.js';

/**
 * Annotation accuracy tests — validate that every tool's annotations
 * correctly reflect its actual behavior semantics.
 *
 * These tests encode the invariant rules:
 * - Read-only tools: readOnlyHint=true, destructiveHint=false, idempotentHint=true
 * - Create/import tools: idempotentHint=false (creates duplicates)
 * - Set/update/delete/close/reopen/rename/apply/restore: idempotentHint=true
 * - Delete/close/reset/restore/manage/merge: destructiveHint=true
 */

const ALL_TOOLS = getToolDefinitions({ enableWrite: true, enableAdvanced: true });

function getAnnotations(name: string) {
  const tool = ALL_TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool.annotations!;
}

// All tool names for bulk checks
const READ_TOOLS = ALL_TOOLS.filter((t) => t.annotations?.readOnlyHint);
const WRITE_TOOLS = ALL_TOOLS.filter((t) => !t.annotations?.readOnlyHint);

describe('annotation accuracy', () => {
  describe('read-only tools', () => {
    it.each(READ_TOOLS.map((t) => t.name))(
      '%s → readOnly=true, destructive=false, idempotent=true',
      (name) => {
        const ann = getAnnotations(name);
        expect(ann.readOnlyHint).toBe(true);
        expect(ann.destructiveHint).toBe(false);
        expect(ann.idempotentHint).toBe(true);
      },
    );
  });

  describe('write tools — idempotency', () => {
    // Tools that target a specific state (set, update, delete, close, reopen, rename, apply, restore)
    // are idempotent: calling twice with the same args produces the same result.
    const IDEMPOTENT_PREFIXES = [
      'set-',
      'update-',
      'delete-',
      'close-',
      'reopen-',
      'rename-',
      'apply-',
      'restore-',
    ];
    const idempotentWriteTools = WRITE_TOOLS.filter((t) =>
      IDEMPOTENT_PREFIXES.some((p) => t.name.toLowerCase().startsWith(p)),
    );

    it.each(idempotentWriteTools.map((t) => t.name))('%s → idempotent=true', (name) => {
      expect(getAnnotations(name).idempotentHint).toBe(true);
    });

    // Tools that create new resources or merge are NOT idempotent (duplicates).
    const NON_IDEMPOTENT_PREFIXES = ['create-', 'import-', 'merge-'];
    const nonIdempotentWriteTools = WRITE_TOOLS.filter((t) =>
      NON_IDEMPOTENT_PREFIXES.some((p) => t.name.toLowerCase().startsWith(p)),
    );

    it.each(nonIdempotentWriteTools.map((t) => t.name))('%s → idempotent=false', (name) => {
      expect(getAnnotations(name).idempotentHint).toBe(false);
    });
  });

  describe('write tools — destructiveness', () => {
    const DESTRUCTIVE_PREFIXES = ['delete-', 'close-', 'reset-', 'restore-'];
    const DESTRUCTIVE_NAMES = ['merge-payees', 'manage-entity'];

    const destructiveTools = WRITE_TOOLS.filter(
      (t) =>
        DESTRUCTIVE_PREFIXES.some((p) => t.name.toLowerCase().startsWith(p)) ||
        DESTRUCTIVE_NAMES.includes(t.name.toLowerCase()),
    );

    it.each(destructiveTools.map((t) => t.name))('%s → destructive=true', (name) => {
      expect(getAnnotations(name).destructiveHint).toBe(true);
    });

    // Create/update/set/import/apply are non-destructive
    const NON_DESTRUCTIVE_PREFIXES = [
      'create-',
      'update-',
      'set-',
      'import-',
      'apply-',
      'rename-',
      'reopen-',
    ];
    const nonDestructiveTools = WRITE_TOOLS.filter((t) =>
      NON_DESTRUCTIVE_PREFIXES.some((p) => t.name.toLowerCase().startsWith(p)),
    );

    it.each(nonDestructiveTools.map((t) => t.name))('%s → destructive=false', (name) => {
      expect(getAnnotations(name).destructiveHint).toBe(false);
    });
  });

  describe('global invariants', () => {
    it('every tool has all four annotation hints', () => {
      for (const tool of ALL_TOOLS) {
        expect(tool.annotations, `${tool.name} missing annotations`).toBeDefined();
        expect(tool.annotations).toHaveProperty('readOnlyHint');
        expect(tool.annotations).toHaveProperty('destructiveHint');
        expect(tool.annotations).toHaveProperty('idempotentHint');
        expect(tool.annotations).toHaveProperty('openWorldHint');
      }
    });

    it('openWorldHint is false for all tools (bounded budget domain)', () => {
      for (const tool of ALL_TOOLS) {
        expect(tool.annotations?.openWorldHint, tool.name).toBe(false);
      }
    });

    it('read-only tools are never destructive', () => {
      for (const tool of READ_TOOLS) {
        expect(tool.annotations?.destructiveHint, tool.name).toBe(false);
      }
    });
  });
});
