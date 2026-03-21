import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockGetSchedules = vi.fn();

vi.mock('../../../core/api/actual-client.js', () => ({
  getSchedules: (...args: unknown[]) => mockGetSchedules(...args),
}));

function parseJsonResponse(response: Awaited<ReturnType<typeof handler>>): Record<string, unknown> {
  const firstContent = response.content[0];

  if (!('text' in firstContent)) {
    throw new Error('Expected text content');
  }

  return JSON.parse(firstContent.text) as Record<string, unknown>;
}

describe('get-schedules handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns schedule data when the Actual server supports schedule APIs', async () => {
    mockGetSchedules.mockResolvedValue([{ id: 'schedule-1', name: 'Monthly Rent' }]);

    const response = await handler({});
    const payload = parseJsonResponse(response);

    expect(payload).toEqual([{ id: 'schedule-1', name: 'Monthly Rent' }]);
  });

  it('returns an unsupported-feature response for older Actual server versions', async () => {
    mockGetSchedules.mockRejectedValue(
      new Error('getSchedules is not available in this version of the API'),
    );

    const response = await handler({});
    const payload = parseJsonResponse(response);

    expect(response.isError).toBe(true);
    expect(payload.message).toContain('Reading recurring schedules is not supported');
  });

  it('returns a generic failure response for other schedule API errors', async () => {
    mockGetSchedules.mockRejectedValue(new Error('Unexpected timeout'));

    const response = await handler({});
    const payload = parseJsonResponse(response);

    expect(response.isError).toBe(true);
    expect(payload.message).toBe('Unexpected timeout');
  });
});
