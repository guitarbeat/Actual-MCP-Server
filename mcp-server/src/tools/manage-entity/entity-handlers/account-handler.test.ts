import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountHandler } from './account-handler.js';

const mockCloseAccount = vi.fn();
const mockCreateAccountWithInitialBalance = vi.fn();
const mockGetAccountBalance = vi.fn();
const mockReopenAccount = vi.fn();
const mockUpdateAccount = vi.fn();
const mockDeleteAccount = vi.fn();

vi.mock('../../../core/api/actual-client.js', () => ({
  closeAccount: (...args: unknown[]) => mockCloseAccount(...args),
  createAccountWithInitialBalance: (...args: unknown[]) =>
    mockCreateAccountWithInitialBalance(...args),
  deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
  getAccountBalance: (...args: unknown[]) => mockGetAccountBalance(...args),
  reopenAccount: (...args: unknown[]) => mockReopenAccount(...args),
  updateAccount: (...args: unknown[]) => mockUpdateAccount(...args),
}));

vi.mock('../../../core/cache/cache-service.js', () => ({
  cacheService: {
    invalidate: vi.fn(),
  },
}));

describe('AccountHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAccountWithInitialBalance.mockResolvedValue('account-1');
    mockUpdateAccount.mockResolvedValue(undefined);
    mockCloseAccount.mockResolvedValue(undefined);
    mockDeleteAccount.mockResolvedValue(undefined);
    mockReopenAccount.mockResolvedValue(undefined);
    mockGetAccountBalance.mockResolvedValue(12345);
  });

  it('maps balanceCurrent to balance_current during account creation', async () => {
    const handler = new AccountHandler();

    const accountId = await handler.create({
      name: 'Checking',
      type: 'checking',
      initialBalance: 10000,
      balanceCurrent: 245000,
    });

    expect(accountId).toBe('account-1');
    expect(mockCreateAccountWithInitialBalance).toHaveBeenCalledWith(
      {
        name: 'Checking',
        type: 'checking',
        balance_current: 245000,
      },
      10000,
    );
  });

  it('maps balanceCurrent to balance_current during account updates', async () => {
    const handler = new AccountHandler();

    await handler.update('account-1', {
      name: 'Updated Checking',
      balanceCurrent: 155000,
    });

    expect(mockUpdateAccount).toHaveBeenCalledWith('account-1', {
      name: 'Updated Checking',
      balance_current: 155000,
    });
  });

  it('passes transfer arguments through when closing an account', async () => {
    const handler = new AccountHandler();

    await handler.close('account-1', {
      transferAccountId: 'account-2',
      transferCategoryId: 'category-1',
    });

    expect(mockCloseAccount).toHaveBeenCalledWith('account-1', 'account-2', 'category-1');
  });
});
