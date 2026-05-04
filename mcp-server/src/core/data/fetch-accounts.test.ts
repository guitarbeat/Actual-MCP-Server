import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAllAccounts } from './fetch-accounts.js';

const mockGetAccounts = vi.fn();

vi.mock('../../core/api/actual-client.js', () => ({
  getAccounts: (...args: unknown[]) => mockGetAccounts(...args),
}));

const sampleAccounts = [
  { id: 'acc-1', name: 'Checking', balance: 100000, offbudget: false, closed: false },
  { id: 'acc-2', name: 'Savings', balance: 50000, offbudget: false, closed: false },
];

describe('fetchAllAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccounts.mockResolvedValue(sampleAccounts);
  });

  it('delegates to getAccounts', async () => {
    const result = await fetchAllAccounts();
    expect(mockGetAccounts).toHaveBeenCalledTimes(1);
    expect(result).toEqual(sampleAccounts);
  });

  it('propagates errors from getAccounts', async () => {
    mockGetAccounts.mockRejectedValue(new Error('API unavailable'));
    await expect(fetchAllAccounts()).rejects.toThrow('API unavailable');
  });
});
