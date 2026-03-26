import { describe, expect, it } from 'vitest';
import { promptDefinitions } from './index.js';

describe('promptDefinitions', () => {
  it('includes the uncategorized triage prompt', async () => {
    const prompt = promptDefinitions.find(
      (candidate) => candidate.name === 'triage-uncategorized-transactions',
    );

    expect(prompt).toBeDefined();

    const result = await prompt!.buildMessages({ accountId: 'Checking' });
    const text = result.messages[0]?.content.text ?? '';

    expect(text).toContain('audit-uncategorized-transactions');
    expect(text).toContain('create-rule');
    expect(text).toContain('update-rule');
    expect(text).toContain('update-transaction');
    expect(text).toContain('"accountId": "Checking"');
  });
});
