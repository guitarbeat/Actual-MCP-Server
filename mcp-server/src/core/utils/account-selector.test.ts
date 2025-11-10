import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Account } from '../types/domain.js';

vi.mock('./name-resolver.js', () => ({
  nameResolver: {
    resolveAccount: vi.fn(),
  },
}));

import { resolveAccountSelection } from './account-selector.js';
import { nameResolver } from './name-resolver.js';

describe('resolveAccountSelection', () => {
  const accounts: Account[] = [
    { id: 'acc-1', name: 'Checking', offbudget: false, closed: false },
    { id: 'acc-2', name: 'Savings', offbudget: false, closed: false },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns empty result when reference is undefined', async () => {
    const result = await resolveAccountSelection(accounts, undefined);

    expect(result).toEqual({});
    expect(nameResolver.resolveAccount).not.toHaveBeenCalled();
  });

  it('resolves account name to matching account details', async () => {
    vi.mocked(nameResolver.resolveAccount).mockResolvedValue('acc-1');

    const result = await resolveAccountSelection(accounts, 'Checking');

    expect(nameResolver.resolveAccount).toHaveBeenCalledWith('Checking');
    expect(result).toEqual({ accountId: 'acc-1', account: accounts[0] });
  });

  it('returns resolved ID even when account is not present in list', async () => {
    vi.mocked(nameResolver.resolveAccount).mockResolvedValue('acc-3');

    const result = await resolveAccountSelection(accounts, 'Investment');

    expect(nameResolver.resolveAccount).toHaveBeenCalledWith('Investment');
    expect(result).toEqual({ accountId: 'acc-3', account: undefined });
  });
});
