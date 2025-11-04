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
  });

  it('failure: surfaces API error', async () => {
    mockApi.deleteSchedule.mockRejectedValue(new Error('nope'));
    const res = await handler({ scheduleId: 'sch_bad' });
    expect(res.isError).toBe(true);
  });
});


