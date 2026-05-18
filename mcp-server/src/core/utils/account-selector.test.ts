import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveAccountSelection } from './account-selector.js';
import { nameResolver } from './name-resolver.js';
import type { Account } from '../types/domain.js';

vi.mock('./name-resolver.js', () => ({
  nameResolver: {
    resolveAccount: vi.fn(),
  },
}));

describe('resolveAccountSelection', () => {
  const mockAccounts: Account[] = [
    { id: 'acc-1', name: 'Checking' } as Account,
    { id: 'acc-2', name: 'Savings' } as Account,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return empty object if reference is undefined', async () => {
    const result = await resolveAccountSelection(mockAccounts, undefined);
    expect(result).toEqual({});
    expect(nameResolver.resolveAccount).not.toHaveBeenCalled();
  });

  it('should return empty object if reference is empty string', async () => {
    const result = await resolveAccountSelection(mockAccounts, '');
    expect(result).toEqual({});
    expect(nameResolver.resolveAccount).not.toHaveBeenCalled();
  });

  it('should return accountId and account if resolved account exists in accounts array', async () => {
    vi.mocked(nameResolver.resolveAccount).mockResolvedValue('acc-2');

    const result = await resolveAccountSelection(mockAccounts, 'Savings');

    expect(nameResolver.resolveAccount).toHaveBeenCalledWith('Savings');
    expect(result).toEqual({
      accountId: 'acc-2',
      account: mockAccounts[1],
    });
  });

  it('should return accountId and undefined account if resolved account does not exist in accounts array', async () => {
    vi.mocked(nameResolver.resolveAccount).mockResolvedValue('acc-3');

    const result = await resolveAccountSelection(mockAccounts, 'NonExistent');

    expect(nameResolver.resolveAccount).toHaveBeenCalledWith('NonExistent');
    expect(result).toEqual({
      accountId: 'acc-3',
      account: undefined,
    });
  });

  it('should propagate error if nameResolver throws', async () => {
    const error = new Error('Account not found');
    vi.mocked(nameResolver.resolveAccount).mockRejectedValue(error);

    await expect(resolveAccountSelection(mockAccounts, 'InvalidAccount')).rejects.toThrow(
      'Account not found',
    );
    expect(nameResolver.resolveAccount).toHaveBeenCalledWith('InvalidAccount');
  });
});
