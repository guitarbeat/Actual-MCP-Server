import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  deleteSchedule: vi.fn(),
}));

const mockApi = vi.hoisted(() => ({
  deleteSchedule: vi.fn<[], any>(),
}));

vi.mock('../../../actual-api.js', async () => mockApi);

describe('delete-schedule tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path: deletes by id', async () => {
    mockApi.deleteSchedule.mockResolvedValue(undefined);
    const res = await handler({ scheduleId: 'sch_9' });
    expect(mockApi.deleteSchedule).toHaveBeenCalledWith('sch_9');
    const text = (res.content?.[0] as any).text as string;
    expect(text).toContain('Successfully deleted schedule sch_9');
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
    mockApi.deleteSchedule.mockRejectedValue(new Error('nope'));
    const res = await handler({ scheduleId: 'sch_bad' });
    expect(res.isError).toBe(true);
    const payload = JSON.parse((res.content?.[0] as any).text as string);
    expect(payload).toEqual({
      error: true,
      message: 'nope',
      suggestion:
        'Confirm the schedule still exists in Actual and that you have permission to delete it before retrying.',
    });
  });
});


