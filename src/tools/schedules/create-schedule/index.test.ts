import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  createSchedule: vi.fn(),
}));

const mockApi = vi.hoisted(() => ({
  createSchedule: vi.fn<[], any>(),
}));

vi.mock('../../../actual-api.js', async () => mockApi);

describe('create-schedule tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path: creates schedule with mapped fields', async () => {
    mockApi.createSchedule.mockResolvedValue('sch_123');

    const res = await handler({
      name: 'Rent',
      accountId: 'acc_1',
      amount: -1240,
      nextDate: '2025-12-01',
      rule: 'monthly',
      payee: 'Bilt',
      category: 'cat_housing',
      notes: 'Autopay',
    });

    expect(mockApi.createSchedule).toHaveBeenCalledWith({
      name: 'Rent',
      account: 'acc_1',
      amount: -1240,
      next_date: '2025-12-01',
      rule: 'monthly',
      payee: 'Bilt',
      category: 'cat_housing',
      notes: 'Autopay',
    });

    const text = (res.content?.[0] as any).text as string;
    expect(text).toContain('Successfully created schedule sch_123');
  });

  it('edge: rejects missing required fields', async () => {
    const bad = await handler({ name: 'x' });
    expect(bad.isError).toBe(true);
    const payload = JSON.parse((bad.content?.[0] as any).text as string);
    expect(payload).toEqual({
      error: true,
      message: 'accountId is required and must be a string',
      suggestion: 'Use the get-accounts tool to list available accounts and retry with a valid accountId.',
    });
  });

  it('failure: surfaces API error', async () => {
    mockApi.createSchedule.mockRejectedValue(new Error('API down'));
    const res = await handler({
      name: 'Rent',
      accountId: 'acc_1',
      amount: -1240,
      nextDate: '2025-12-01',
      rule: 'monthly',
    });
    expect(res.isError).toBe(true);
    const payload = JSON.parse((res.content?.[0] as any).text as string);
    expect(payload).toEqual({
      error: true,
      message: 'API down',
      suggestion:
        'Verify the accountId, category, and payee references are valid and that the Actual server is reachable.',
    });
  });
});


