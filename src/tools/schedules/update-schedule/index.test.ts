import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  updateSchedule: vi.fn(),
}));

const mockApi = vi.hoisted(() => ({
  updateSchedule: vi.fn(),
}));

vi.mock('../../../actual-api.js', async () => mockApi);

describe('update-schedule tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path: updates with provided fields and maps keys', async () => {
    mockApi.updateSchedule.mockResolvedValue(undefined);
    const res = await handler({
      scheduleId: 'sch_1',
      accountId: 'acc_9',
      nextDate: '2026-01-01',
      amount: -150,
      notes: 'adjusted',
    });
    expect(mockApi.updateSchedule).toHaveBeenCalledWith(
      'sch_1',
      expect.objectContaining({
        account: 'acc_9',
        next_date: '2026-01-01',
        amount: -150,
        notes: 'adjusted',
      })
    );
    const text = (res.content?.[0] as any).text as string;
    expect(text).toContain('Successfully updated schedule sch_1');
  });

  it('edge: scheduleId required', async () => {
    const res = await handler({});
    expect(res.isError).toBe(true);
    const payload = JSON.parse((res.content?.[0] as any).text as string);
    expect(payload).toEqual({
      error: true,
      message: 'scheduleId is required and must be a string',
      suggestion: 'Use the get-schedules tool to list recurring schedules and retry with a valid scheduleId.',
    });
  });

  it('failure: surfaces API error', async () => {
    mockApi.updateSchedule.mockRejectedValue(new Error('fail'));
    const res = await handler({ scheduleId: 'sch_x' });
    expect(res.isError).toBe(true);
    const payload = JSON.parse((res.content?.[0] as any).text as string);
    expect(payload).toEqual({
      error: true,
      message: 'fail',
      suggestion:
        'Confirm the schedule exists and that any referenced payees, accounts, or categories are valid before retrying.',
    });
  });
});
