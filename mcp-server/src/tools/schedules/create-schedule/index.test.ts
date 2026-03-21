import { beforeEach, describe, expect, it, vi } from 'vitest';
import { unsupportedFeatureError } from '../../../core/response/error-builder.js';
import { handler } from './index.js';

const mockCreate = vi.fn();
const mockInvalidateCache = vi.fn();

vi.mock('../../manage-entity/entity-handlers/schedule-handler.js', () => ({
  ScheduleHandler: vi.fn().mockImplementation(() => ({
    create: (...args: unknown[]) => mockCreate(...args),
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

describe('create-schedule handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates schedules successfully when the API is available', async () => {
    mockCreate.mockResolvedValue('schedule-1');

    const response = await handler({
      name: 'Monthly Rent',
      account: 'Checking',
      amount: -1500,
      date: '2025-02-01',
    });

    expect(response.content[0]).toEqual({
      type: 'text',
      text: 'Successfully created schedule "Monthly Rent" with id schedule-1',
    });
    expect(mockInvalidateCache).toHaveBeenCalledTimes(1);
  });

  it('returns unsupported-feature responses from the schedule handler unchanged', async () => {
    mockCreate.mockRejectedValue(
      unsupportedFeatureError('Creating schedule', {
        suggestion: 'Upgrade Actual before retrying.',
      }),
    );

    const response = await handler({
      name: 'Monthly Rent',
      account: 'Checking',
      amount: -1500,
      date: '2025-02-01',
    });
    const payload = parseJsonResponse(response);

    expect(response.isError).toBe(true);
    expect(payload.message).toContain('Creating schedule is not supported');
    expect(payload.suggestion).toBe('Upgrade Actual before retrying.');
  });

  it('validates the schedule payload before invoking the handler', async () => {
    const response = await handler({
      name: 'Broken Schedule',
      date: '2025/02/01',
    });
    const payload = parseJsonResponse(response);

    expect(response.isError).toBe(true);
    expect(payload.message).toContain('Validation error');
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
