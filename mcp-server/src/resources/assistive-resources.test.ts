import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAssistiveResource } from './assistive-resources.js';

vi.mock('../core/api/actual-client.js', () => ({
  getAccounts: vi.fn(),
  getBudgetMonth: vi.fn(),
  getPayeeRules: vi.fn(),
  getRules: vi.fn(),
}));

vi.mock('../core/analysis/financial-analyzer.js', () => ({
  generateInsightsSummary: vi.fn(),
}));

vi.mock('../core/data/fetch-payees.js', () => ({
  fetchAllPayeesMap: vi.fn(),
}));

const actualClientModule = await import('../core/api/actual-client.js');
const { getRules } = actualClientModule;

function getTextContent(result: Awaited<ReturnType<typeof handleAssistiveResource>>): string {
  const firstContent = result.contents[0];

  if (!('text' in firstContent)) {
    throw new Error('Expected a text resource');
  }

  return firstContent.text;
}

describe('handleAssistiveResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats rule actions that include a field', async () => {
    vi.mocked(getRules).mockResolvedValue([
      {
        id: 'rule-1',
        stage: null,
        conditionsOp: 'and',
        conditions: [
          {
            field: 'payee',
            op: 'is',
            value: 'payee-1',
          },
        ],
        actions: [
          {
            field: 'category',
            op: 'set',
            value: 'cat-1',
          },
        ],
      },
    ]);

    const result = await handleAssistiveResource('actual://rules', 'rules', []);
    const text = getTextContent(result);

    expect(text).toContain('payee is payee-1');
    expect(text).toContain('category set cat-1');
  });

  it('formats rule actions that do not include a field', async () => {
    vi.mocked(getRules).mockResolvedValue([
      {
        id: 'rule-2',
        stage: 'post',
        conditionsOp: 'and',
        conditions: [],
        actions: [
          {
            op: 'set-split-amount',
            value: 50,
            options: {
              method: 'fixed-percent',
              splitIndex: 0,
            },
          },
        ],
      },
    ]);

    const result = await handleAssistiveResource('actual://rules', 'rules', []);
    const text = getTextContent(result);

    expect(text).toContain('set-split-amount 50');
  });

  it('returns a plain-text error for unrecognized resource URIs', async () => {
    const result = await handleAssistiveResource('actual://unknown', 'unknown', []);

    expect(result.contents).toEqual([
      {
        uri: 'actual://unknown',
        text: 'Error: Unrecognized resource URI: actual://unknown',
        mimeType: 'text/plain',
      },
    ]);
  });
});
