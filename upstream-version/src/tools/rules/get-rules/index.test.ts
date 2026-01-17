import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockData = vi.hoisted(() => ({
  fetchAllRules: vi.fn(),
}));

vi.mock('../../../core/data/fetch-rules.js', () => mockData);

describe('get-rules tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all rules', async () => {
    const mockRules = [
      {
        id: 'rule-1',
        conditionsOp: 'and',
        conditions: [{ field: 'payee', op: 'is', value: 'payee-123' }],
        actions: [{ field: 'category', op: 'set', value: 'cat-456' }],
        stage: 'pre',
      },
      {
        id: 'rule-2',
        conditionsOp: 'or',
        conditions: [{ field: 'amount', op: 'is', value: -5000 }],
        actions: [{ field: 'category', op: 'set', value: 'cat-789' }],
        stage: 'post',
      },
    ];
    mockData.fetchAllRules.mockResolvedValue(mockRules);

    const response = await handler({});

    expect(mockData.fetchAllRules).toHaveBeenCalled();
    expect(response.isError).toBeUndefined();
    const data = JSON.parse((response.content?.[0] as { text: string }).text);
    expect(data).toEqual(mockRules);
  });

  it('should filter rules by payeeId', async () => {
    const mockRules = [
      {
        id: 'rule-1',
        conditionsOp: 'and',
        conditions: [{ field: 'payee', op: 'is', value: 'payee-123' }],
        actions: [{ field: 'category', op: 'set', value: 'cat-456' }],
        stage: 'pre',
      },
      {
        id: 'rule-2',
        conditionsOp: 'or',
        conditions: [{ field: 'payee', op: 'is', value: 'payee-456' }],
        actions: [{ field: 'category', op: 'set', value: 'cat-789' }],
        stage: 'post',
      },
      {
        id: 'rule-3',
        conditionsOp: 'and',
        conditions: [{ field: 'amount', op: 'is', value: -5000 }],
        actions: [{ field: 'category', op: 'set', value: 'cat-999' }],
        stage: 'pre',
      },
    ];
    mockData.fetchAllRules.mockResolvedValue(mockRules);

    const response = await handler({ payeeId: 'payee-123' });

    expect(response.isError).toBeUndefined();
    const data = JSON.parse((response.content?.[0] as { text: string }).text);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('rule-1');
  });

  it('should filter rules by categoryId', async () => {
    const mockRules = [
      {
        id: 'rule-1',
        conditionsOp: 'and',
        conditions: [{ field: 'category', op: 'is', value: 'cat-123' }],
        actions: [{ field: 'category', op: 'set', value: 'cat-456' }],
        stage: 'pre',
      },
      {
        id: 'rule-2',
        conditionsOp: 'or',
        conditions: [{ field: 'payee', op: 'is', value: 'payee-456' }],
        actions: [{ field: 'category', op: 'set', value: 'cat-789' }],
        stage: 'post',
      },
    ];
    mockData.fetchAllRules.mockResolvedValue(mockRules);

    const response = await handler({ categoryId: 'cat-123' });

    expect(response.isError).toBeUndefined();
    const data = JSON.parse((response.content?.[0] as { text: string }).text);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('rule-1');
  });

  it('should filter rules by payeeId with oneOf operator', async () => {
    const mockRules = [
      {
        id: 'rule-1',
        conditionsOp: 'and',
        conditions: [{ field: 'payee', op: 'oneOf', value: ['payee-123', 'payee-456'] }],
        actions: [{ field: 'category', op: 'set', value: 'cat-456' }],
        stage: 'pre',
      },
      {
        id: 'rule-2',
        conditionsOp: 'or',
        conditions: [{ field: 'payee', op: 'is', value: 'payee-789' }],
        actions: [{ field: 'category', op: 'set', value: 'cat-789' }],
        stage: 'post',
      },
    ];
    mockData.fetchAllRules.mockResolvedValue(mockRules);

    const response = await handler({ payeeId: 'payee-123' });

    expect(response.isError).toBeUndefined();
    const data = JSON.parse((response.content?.[0] as { text: string }).text);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('rule-1');
  });

  it('should apply limit to results', async () => {
    const mockRules = [
      {
        id: 'rule-1',
        conditionsOp: 'and',
        conditions: [{ field: 'payee', op: 'is', value: 'payee-123' }],
        actions: [{ field: 'category', op: 'set', value: 'cat-456' }],
        stage: 'pre',
      },
      {
        id: 'rule-2',
        conditionsOp: 'or',
        conditions: [{ field: 'payee', op: 'is', value: 'payee-456' }],
        actions: [{ field: 'category', op: 'set', value: 'cat-789' }],
        stage: 'post',
      },
    ];
    mockData.fetchAllRules.mockResolvedValue(mockRules);

    const response = await handler({ limit: 1 });

    expect(response.isError).toBeUndefined();
    const data = JSON.parse((response.content?.[0] as { text: string }).text);
    expect(data).toHaveLength(1);
  });

  it('should apply payeeId filter and limit together', async () => {
    const mockRules = [
      {
        id: 'rule-1',
        conditionsOp: 'and',
        conditions: [{ field: 'payee', op: 'is', value: 'payee-123' }],
        actions: [{ field: 'category', op: 'set', value: 'cat-456' }],
        stage: 'pre',
      },
      {
        id: 'rule-2',
        conditionsOp: 'or',
        conditions: [{ field: 'payee', op: 'is', value: 'payee-123' }],
        actions: [{ field: 'category', op: 'set', value: 'cat-789' }],
        stage: 'post',
      },
    ];
    mockData.fetchAllRules.mockResolvedValue(mockRules);

    const response = await handler({ payeeId: 'payee-123', limit: 1 });

    expect(response.isError).toBeUndefined();
    const data = JSON.parse((response.content?.[0] as { text: string }).text);
    expect(data).toHaveLength(1);
  });

  it('should reject invalid payeeId type', async () => {
    const response = await handler({ payeeId: 123 });

    expect(response.isError).toBe(true);
    expect(mockData.fetchAllRules).not.toHaveBeenCalled();
  });

  it('should reject invalid categoryId type', async () => {
    const response = await handler({ categoryId: 123 });

    expect(response.isError).toBe(true);
  });

  it('should reject invalid limit (not a number)', async () => {
    const response = await handler({ limit: 'invalid' });

    expect(response.isError).toBe(true);
  });

  it('should reject invalid limit (less than 1)', async () => {
    const response = await handler({ limit: 0 });

    expect(response.isError).toBe(true);
  });

  it('should handle empty rules list', async () => {
    mockData.fetchAllRules.mockResolvedValue([]);

    const response = await handler({});

    expect(response.isError).toBeUndefined();
    const data = JSON.parse((response.content?.[0] as { text: string }).text);
    expect(data).toEqual([]);
  });

  it('should handle API errors', async () => {
    mockData.fetchAllRules.mockRejectedValue(new Error('API error'));

    const response = await handler({});

    expect(response.isError).toBe(true);
  });
});
