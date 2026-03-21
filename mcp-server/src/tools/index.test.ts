import { describe, expect, it } from 'vitest';
import { getAvailableTools } from './index.js';

function toolNames(enableWrite: boolean, enableNini: boolean): string[] {
  return getAvailableTools(enableWrite, enableNini).map((tool) => tool.schema.name);
}

describe('getAvailableTools', () => {
  it('returns only read-only core tools when write access is disabled', () => {
    const names = toolNames(false, false);

    expect(names).toContain('get-transactions');
    expect(names).toContain('recommend-budget-plan');
    expect(names).toContain('get-schedules');
    expect(names).not.toContain('apply-budget-plan');
    expect(names).not.toContain('reconcile-account');
    expect(names).not.toContain('set-account-starting-balance');
    expect(names).not.toContain('create-schedule');
    expect(names).not.toContain('close-account');
  });

  it('includes write-capable core tools when write access is enabled', () => {
    const names = toolNames(true, false);

    expect(names).toContain('apply-budget-plan');
    expect(names).toContain('reconcile-account');
    expect(names).toContain('set-account-starting-balance');
    expect(names).toContain('import-transaction-batch');
    expect(names).toContain('create-schedule');
    expect(names).toContain('update-schedule');
    expect(names).toContain('delete-schedule');
    expect(names).not.toContain('close-account');
    expect(names).not.toContain('switch-budget');
  });

  it('includes advanced nini-only tools only when nini mode is enabled', () => {
    const names = toolNames(true, true);

    expect(names).toContain('close-account');
    expect(names).toContain('reopen-account');
    expect(names).toContain('hold-budget');
    expect(names).toContain('reset-budget-hold');
    expect(names).toContain('get-budget-files');
    expect(names).toContain('switch-budget');
  });
});
