import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockApi = vi.hoisted(() => ({
  mergePayees: vi.fn(),
}));

vi.mock('../../../actual-api.js', () => mockApi);

describe('merge-payees tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should merge payees successfully', async () => {
    mockApi.mergePayees.mockResolvedValue(undefined);

    const response = await handler({
      targetPayeeId: 'payee-target',
      sourcePayeeIds: ['payee-1', 'payee-2'],
    });

    expect(mockApi.mergePayees).toHaveBeenCalledWith('payee-target', ['payee-1', 'payee-2']);
    expect(response.isError).toBeUndefined();
    const data = JSON.parse((response.content?.[0] as { text: string }).text);
    expect(data).toContain('Successfully merged payees');
    expect(data).toContain('payee-1, payee-2');
    expect(data).toContain('payee-target');
  });

  it('should handle single source payee', async () => {
    mockApi.mergePayees.mockResolvedValue(undefined);

    const response = await handler({
      targetPayeeId: 'payee-target',
      sourcePayeeIds: ['payee-1'],
    });

    expect(mockApi.mergePayees).toHaveBeenCalledWith('payee-target', ['payee-1']);
    expect(response.isError).toBeUndefined();
  });

  it('should return error when targetPayeeId is missing', async () => {
    const response = await handler({
      sourcePayeeIds: ['payee-1'],
    });

    expect(response.isError).toBe(true);
    expect(mockApi.mergePayees).not.toHaveBeenCalled();
  });

  it('should return error when targetPayeeId is not a string', async () => {
    const response = await handler({
      targetPayeeId: 123,
      sourcePayeeIds: ['payee-1'],
    });

    expect(response.isError).toBe(true);
    expect(mockApi.mergePayees).not.toHaveBeenCalled();
  });

  it('should return error when sourcePayeeIds is missing', async () => {
    const response = await handler({
      targetPayeeId: 'payee-target',
    });

    expect(response.isError).toBe(true);
    expect(mockApi.mergePayees).not.toHaveBeenCalled();
  });

  it('should return error when sourcePayeeIds is not an array', async () => {
    const response = await handler({
      targetPayeeId: 'payee-target',
      sourcePayeeIds: 'payee-1',
    });

    expect(response.isError).toBe(true);
    expect(mockApi.mergePayees).not.toHaveBeenCalled();
  });

  it('should return error when sourcePayeeIds contains non-string values', async () => {
    const response = await handler({
      targetPayeeId: 'payee-target',
      sourcePayeeIds: ['payee-1', 123, 'payee-2'],
    });

    expect(response.isError).toBe(true);
    expect(mockApi.mergePayees).not.toHaveBeenCalled();
  });

  it('should handle empty sourcePayeeIds array', async () => {
    mockApi.mergePayees.mockResolvedValue(undefined);

    const response = await handler({
      targetPayeeId: 'payee-target',
      sourcePayeeIds: [],
    });

    expect(mockApi.mergePayees).toHaveBeenCalledWith('payee-target', []);
    expect(response.isError).toBeUndefined();
  });

  it('should handle API errors', async () => {
    mockApi.mergePayees.mockRejectedValue(new Error('Merge failed'));

    const response = await handler({
      targetPayeeId: 'payee-target',
      sourcePayeeIds: ['payee-1'],
    });

    expect(response.isError).toBe(true);
  });
});
