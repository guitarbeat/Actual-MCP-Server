import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveAccountSelection } from './account-selector.js';

const mockResolveAccount = vi.fn();

vi.mock('./name-resolver.js', () => ({
  nameResolver: {
    resolveAccount: (...args: unknown[]) => mockResolveAccount(...args),
  },
}));

const makeAccount = (id: string, name: string) => ({
  id,
  name,
  balance: 0,
  offbudget: false,
  closed: false,
});

describe('resolveAccountSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty object when reference is undefined', async () => {
    const result = await resolveAccountSelection([], undefined);
    expect(result).toEqual({});
    expect(mockResolveAccount).not.toHaveBeenCalled();
  });

  it('returns empty object when reference is empty string', async () => {
    const result = await resolveAccountSelection([], '');
    expect(result).toEqual({});
    expect(mockResolveAccount).not.toHaveBeenCalled();
  });

  it('resolves account name to id and finds matching account', async () => {
    const accounts = [makeAccount('acc-1', 'Checking'), makeAccount('acc-2', 'Savings')];
    mockResolveAccount.mockResolvedValue('acc-1');

    const result = await resolveAccountSelection(accounts, 'Checking');
    expect(mockResolveAccount).toHaveBeenCalledWith('Checking');
    expect(result.accountId).toBe('acc-1');
    expect(result.account?.name).toBe('Checking');
  });

  it('returns accountId but no account when id not found in list', async () => {
    const accounts = [makeAccount('acc-1', 'Checking')];
    mockResolveAccount.mockResolvedValue('acc-unknown');

    const result = await resolveAccountSelection(accounts, 'Unknown');
    expect(result.accountId).toBe('acc-unknown');
    expect(result.account).toBeUndefined();
  });

  it('resolves by account id directly', async () => {
    const accounts = [makeAccount('acc-1', 'Checking')];
    mockResolveAccount.mockResolvedValue('acc-1');

    const result = await resolveAccountSelection(accounts, 'acc-1');
    expect(result.accountId).toBe('acc-1');
    expect(result.account?.id).toBe('acc-1');
  });
});
