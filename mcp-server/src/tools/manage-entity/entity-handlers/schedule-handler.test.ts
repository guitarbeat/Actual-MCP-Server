import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduleHandler } from './schedule-handler.js';

const mockCreateSchedule = vi.fn();
const mockDeleteSchedule = vi.fn();
const mockGetSchedules = vi.fn();
const mockUpdateSchedule = vi.fn();
const mockResolveAccount = vi.fn();
const mockResolveCategory = vi.fn();
const mockResolvePayee = vi.fn();

vi.mock('../../../core/api/actual-client.js', () => ({
  createSchedule: (...args: unknown[]) => mockCreateSchedule(...args),
  deleteSchedule: (...args: unknown[]) => mockDeleteSchedule(...args),
  getSchedules: (...args: unknown[]) => mockGetSchedules(...args),
  updateSchedule: (...args: unknown[]) => mockUpdateSchedule(...args),
}));

vi.mock('../../../core/cache/cache-service.js', () => ({
  cacheService: {
    invalidate: vi.fn(),
  },
}));

vi.mock('../../../core/utils/name-resolver.js', () => ({
  nameResolver: {
    resolveAccount: (...args: unknown[]) => mockResolveAccount(...args),
    resolveCategory: (...args: unknown[]) => mockResolveCategory(...args),
    resolvePayee: (...args: unknown[]) => mockResolvePayee(...args),
  },
}));

describe('ScheduleHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAccount.mockResolvedValue('account-checking');
    mockResolveCategory.mockResolvedValue('category-rent');
    mockResolvePayee.mockResolvedValue('payee-landlord');
  });

  it('defaults amountOp to "is" when creating schedules with an amount', async () => {
    mockCreateSchedule.mockResolvedValue('schedule-1');

    const handler = new ScheduleHandler();
    const scheduleId = await handler.create({
      name: 'Rent',
      account: 'Checking',
      amount: -25,
      date: '2025-02-01',
      payee: 'Landlord',
      category: 'Rent',
    });

    expect(scheduleId).toBe('schedule-1');
    expect(mockCreateSchedule).toHaveBeenCalledWith({
      name: 'Rent',
      account: 'account-checking',
      amount: -2500,
      amountOp: 'is',
      date: '2025-02-01',
      payee: 'payee-landlord',
      category: 'category-rent',
    });
  });

  it('merges updates with the existing schedule so partial updates remain valid', async () => {
    mockGetSchedules.mockResolvedValue([
      {
        id: 'schedule-1',
        name: 'Rent',
        account: 'account-checking',
        payee: 'payee-landlord',
        amount: -2500,
        amountOp: 'is',
        date: '2025-02-01',
        posts_transaction: false,
      },
    ]);
    mockUpdateSchedule.mockResolvedValue('schedule-1');

    const handler = new ScheduleHandler();
    await handler.update('schedule-1', {
      posts_transaction: true,
    });

    expect(mockUpdateSchedule).toHaveBeenCalledWith(
      'schedule-1',
      {
        name: 'Rent',
        account: 'account-checking',
        payee: 'payee-landlord',
        amount: -2500,
        amountOp: 'is',
        date: '2025-02-01',
        posts_transaction: true,
      },
      undefined,
    );
  });

  it('throws a clear error when the target schedule cannot be loaded', async () => {
    mockGetSchedules.mockResolvedValue([]);

    const handler = new ScheduleHandler();

    await expect(
      handler.update('schedule-missing', {
        amount: -30,
        amountOp: 'is',
      }),
    ).rejects.toThrow("Schedule 'schedule-missing' could not be loaded.");
    expect(mockUpdateSchedule).not.toHaveBeenCalled();
  });

  it('passes resetNextDate through to the Actual API update call', async () => {
    mockGetSchedules.mockResolvedValue([
      {
        id: 'schedule-1',
        name: 'Rent',
        account: 'account-checking',
        payee: 'payee-landlord',
        amount: -2500,
        amountOp: 'is',
        date: '2025-02-01',
        posts_transaction: false,
      },
    ]);
    mockUpdateSchedule.mockResolvedValue('schedule-1');

    const handler = new ScheduleHandler();
    await handler.update('schedule-1', {
      resetNextDate: true,
    });

    expect(mockUpdateSchedule).toHaveBeenCalledWith(
      'schedule-1',
      {
        name: 'Rent',
        account: 'account-checking',
        payee: 'payee-landlord',
        amount: -2500,
        amountOp: 'is',
        date: '2025-02-01',
        posts_transaction: false,
      },
      true,
    );
  });
});
