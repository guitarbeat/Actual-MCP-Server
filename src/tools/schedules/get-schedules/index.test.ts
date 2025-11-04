import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  getSchedules: vi.fn(),
}));

const mockApi = vi.hoisted(() => ({
  getSchedules: vi.fn<[], any>(),
}));

vi.mock('../../../actual-api.js', async () => mockApi);

describe('get-schedules tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path: returns schedules json', async () => {
    mockApi.getSchedules.mockResolvedValue([{ id: 'sch_1' }, { id: 'sch_2' }]);
    const res = await handler({});
    const text = (res.content?.[0] as any).text as string;
    expect(JSON.parse(text)).toEqual([{ id: 'sch_1' }, { id: 'sch_2' }]);
  });

  it('failure: surfaces API error', async () => {
    mockApi.getSchedules.mockRejectedValue(new Error('boom'));
    const res = await handler({});
    expect(res.isError).toBe(true);
    const payload = JSON.parse((res.content?.[0] as any).text as string);
    expect(payload).toEqual({
      error: true,
      message: 'boom',
      suggestion:
        'Verify the Actual Budget server is reachable and that your user can read schedules before retrying.',
    });
  });
});


