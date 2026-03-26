import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockUpdate = vi.fn();
const mockInvalidateCache = vi.fn();

vi.mock('../../manage-entity/entity-handlers/schedule-handler.js', () => ({
  ScheduleHandler: vi.fn().mockImplementation(() => ({
    update: (...args: unknown[]) => mockUpdate(...args),
    invalidateCache: (...args: unknown[]) => mockInvalidateCache(...args),
  })),
}));

function parseJsonResponse(response: Awaited<ReturnType<typeof handler>>): Record<string, unknown> {
  const firstContent = response.content[0];

  if (!('text' in firstContent)) {
    throw new Error('Expected text content');
  }

  return JSON.parse(firstContent.text) as Record<string, unknown>;
}

describe('update-schedule handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates schedules successfully when the payload uses supported schedule fields', async () => {
    const response = await handler({
      id: '970873c4-7dc3-4c20-a095-a60e3e7abc18',
      amount: -30,
      amountOp: 'is',
    });

    expect(response.content[0]).toEqual({
      type: 'text',
      text: 'Successfully updated schedule with id 970873c4-7dc3-4c20-a095-a60e3e7abc18',
    });
    expect(mockUpdate).toHaveBeenCalledWith('970873c4-7dc3-4c20-a095-a60e3e7abc18', {
      amount: -30,
      amountOp: 'is',
    });
    expect(mockInvalidateCache).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported schedule fields from the MCP boundary', async () => {
    const response = await handler({
      id: '970873c4-7dc3-4c20-a095-a60e3e7abc18',
      notes: 'unsupported',
    } as unknown as Parameters<typeof handler>[0]);
    const payload = parseJsonResponse(response);

    expect(response.isError).toBe(true);
    expect(String(payload.message)).toContain('Validation error');
    expect(String(payload.message)).toContain("Unrecognized key(s) in object: 'notes'");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('requires at least one supported field to update', async () => {
    const response = await handler({
      id: '970873c4-7dc3-4c20-a095-a60e3e7abc18',
    });
    const payload = parseJsonResponse(response);

    expect(response.isError).toBe(true);
    expect(payload.message).toBe('No fields provided for update');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('allows resetNextDate as a standalone schedule update', async () => {
    const response = await handler({
      id: '970873c4-7dc3-4c20-a095-a60e3e7abc18',
      resetNextDate: true,
    });

    expect(response.isError).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledWith('970873c4-7dc3-4c20-a095-a60e3e7abc18', {
      resetNextDate: true,
    });
  });
});
