import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';
import * as actualApi from '../../actual-api.js';

// Mock the actual-api module
vi.mock('../../actual-api.js', () => ({
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  closeAccount: vi.fn(),
  reopenAccount: vi.fn(),
  getAccountBalance: vi.fn(),
}));

// Mock the name resolver
vi.mock('../../core/utils/name-resolver.js', () => ({
  nameResolver: {
    resolveAccount: vi.fn((id) => Promise.resolve(id)),
    resolveCategory: vi.fn((id) => Promise.resolve(id)),
  },
}));

describe('manage-account integration tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('end-to-end create operation', () => {
    it('should create account successfully', async () => {
      vi.mocked(actualApi.createAccount).mockResolvedValue('new-acc-id');

      const result = await handler({
        operation: 'create',
        account: {
          name: 'My Checking',
          type: 'checking',
        },
      });

      expect(result.isError).not.toBe(true);
      expect(result.content[0].text).toContain('✓ Account created successfully');
      expect(result.content[0].text).toContain('Account ID: new-acc-id');
      expect(actualApi.createAccount).toHaveBeenCalledWith({
        name: 'My Checking',
        type: 'checking',
      });
    });

    it('should handle create with initial balance', async () => {
      vi.mocked(actualApi.createAccount).mockResolvedValue('new-acc-id');
      vi.mocked(actualApi.updateAccount).mockResolvedValue(undefined);

      const result = await handler({
        operation: 'create',
        account: {
          name: 'Savings',
          type: 'savings',
        },
        initialBalance: 100000,
      });

      expect(result.isError).not.toBe(true);
      expect(result.content[0].text).toContain('Initial Balance: $1000.00');
      expect(actualApi.updateAccount).toHaveBeenCalledWith('new-acc-id', { balance: 100000 });
    });
  });

  describe('end-to-end update operation', () => {
    it('should update account successfully', async () => {
      vi.mocked(actualApi.updateAccount).mockResolvedValue(undefined);

      const result = await handler({
        operation: 'update',
        id: 'acc-123',
        account: {
          name: 'Updated Name',
        },
      });

      expect(result.isError).not.toBe(true);
      expect(result.content[0].text).toContain('✓ Account updated successfully');
      expect(result.content[0].text).toContain('Account ID: acc-123');
      expect(actualApi.updateAccount).toHaveBeenCalledWith('acc-123', {
        name: 'Updated Name',
      });
    });
  });

  describe('end-to-end delete operation', () => {
    it('should delete account successfully', async () => {
      vi.mocked(actualApi.deleteAccount).mockResolvedValue(undefined);

      const result = await handler({
        operation: 'delete',
        id: 'acc-123',
      });

      expect(result.isError).not.toBe(true);
      expect(result.content[0].text).toContain('✓ Account deleted successfully');
      expect(result.content[0].text).toContain('⚠️  This operation cannot be undone.');
      expect(actualApi.deleteAccount).toHaveBeenCalledWith('acc-123');
    });
  });

  describe('end-to-end close operation', () => {
    it('should close account with transfer', async () => {
      vi.mocked(actualApi.closeAccount).mockResolvedValue(undefined);

      const result = await handler({
        operation: 'close',
        id: 'acc-123',
        transferAccountId: 'acc-456',
      });

      expect(result.isError).not.toBe(true);
      expect(result.content[0].text).toContain('✓ Account closed successfully');
      expect(result.content[0].text).toContain('Balance transferred to account: acc-456');
      expect(actualApi.closeAccount).toHaveBeenCalledWith('acc-123');
    });
  });

  describe('end-to-end reopen operation', () => {
    it('should reopen account successfully', async () => {
      vi.mocked(actualApi.reopenAccount).mockResolvedValue(undefined);

      const result = await handler({
        operation: 'reopen',
        id: 'acc-123',
      });

      expect(result.isError).not.toBe(true);
      expect(result.content[0].text).toContain('✓ Account reopened successfully');
      expect(actualApi.reopenAccount).toHaveBeenCalledWith('acc-123');
    });
  });

  describe('end-to-end balance query', () => {
    it('should query account balance successfully', async () => {
      vi.mocked(actualApi.getAccountBalance).mockResolvedValue(50000);

      const result = await handler({
        operation: 'balance',
        id: 'acc-123',
      });

      expect(result.isError).not.toBe(true);
      expect(result.content[0].text).toContain('Account Balance');
      expect(result.content[0].text).toContain('Balance: $500.00');
      expect(actualApi.getAccountBalance).toHaveBeenCalledWith('acc-123', undefined);
    });
  });

  describe('error scenarios', () => {
    it('should handle invalid account type', async () => {
      const result = await handler({
        operation: 'create',
        account: {
          name: 'Test',
          type: 'invalid-type' as any,
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid account type');
    });

    it('should handle missing id for update', async () => {
      const result = await handler({
        operation: 'update',
        account: {
          name: 'Test',
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('id is required for update operation');
    });

    it('should handle missing account name for create', async () => {
      const result = await handler({
        operation: 'create',
        account: {
          type: 'checking',
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('account.name is required for create operation');
    });
  });
});
