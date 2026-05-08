import { describe, expect, it } from 'vitest';
import { promptDefinitions } from './index.js';

describe('promptDefinitions', () => {
  it('registers eight reusable workflow prompts aligned with tool-surface workflows', () => {
    expect(promptDefinitions).toHaveLength(8);
    const names = new Set(promptDefinitions.map((definition) => definition.name));
    expect(names.has('analyze-monthly-spending')).toBe(true);
    expect(names.has('financial-health-check')).toBe(true);
    expect(names.has('triage-uncategorized-transactions')).toBe(true);
    expect(names.has('monthly-budget-review')).toBe(true);
    expect(names.has('reconcile-accounts-pass')).toBe(true);
    expect(names.has('schedule-health-check')).toBe(true);
    expect(names.has('import-sync-checklist')).toBe(true);
    expect(names.has('historical-transfer-review')).toBe(true);
  });

  it('includes the uncategorized triage prompt', async () => {
    const prompt = promptDefinitions.find(
      (candidate) => candidate.name === 'triage-uncategorized-transactions',
    );

    expect(prompt).toBeDefined();

    const result = await prompt!.buildMessages({ accountId: 'Checking' });
    const text = result.messages[0]?.content.text ?? '';

    expect(text).toContain('audit-historical-transfers');
    expect(text).toContain('apply-historical-transfers');
    expect(text).toContain('audit-uncategorized-transactions');
    expect(text).toContain('create-rule');
    expect(text).toContain('update-rule');
    expect(text).toContain('update-transaction');
    expect(text).toContain('"accountId": "Checking"');
  });
});
