import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PayeeHandler } from './payee-handler.js';

const mockCreatePayee = vi.fn();
const mockUpdatePayee = vi.fn();
const mockDeletePayee = vi.fn();
const mockCacheInvalidate = vi.fn();

vi.mock('../../../core/api/actual-client.js', () => ({
  createPayee: (...args: unknown[]) => mockCreatePayee(...args),
  updatePayee: (...args: unknown[]) => mockUpdatePayee(...args),
  deletePayee: (...args: unknown[]) => mockDeletePayee(...args),
}));

vi.mock('../../../core/cache/cache-service.js', () => ({
  cacheService: {
    invalidate: (...args: unknown[]) => mockCacheInvalidate(...args),
  },
}));

describe('PayeeHandler', () => {
  let handler: PayeeHandler;
  const validTransferAccountId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new PayeeHandler();
    mockCreatePayee.mockResolvedValue('payee-new');
    mockUpdatePayee.mockResolvedValue(undefined);
    mockDeletePayee.mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('calls createPayee with valid data', async () => {
      const id = await handler.create({ name: 'Amazon' });
      expect(mockCreatePayee).toHaveBeenCalledWith({ name: 'Amazon' });
      expect(id).toBe('payee-new');
    });

    it('includes transferAccount when provided', async () => {
      await handler.create({ name: 'Transfer', transferAccount: validTransferAccountId });
      expect(mockCreatePayee).toHaveBeenCalledWith({
        name: 'Transfer',
        transferAccount: validTransferAccountId,
      });
    });

    it('throws when name is empty', async () => {
      await expect(handler.create({ name: '' })).rejects.toThrow();
    });

    it('throws when transferAccount is not a UUID', async () => {
      await expect(handler.create({ name: 'X', transferAccount: 'not-uuid' })).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('calls updatePayee with id and validated data', async () => {
      await handler.update('payee-1', { name: 'Updated Name' });
      expect(mockUpdatePayee).toHaveBeenCalledWith('payee-1', { name: 'Updated Name' });
    });

    it('throws when name is empty', async () => {
      await expect(handler.update('payee-1', { name: '' })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('calls deletePayee with id', async () => {
      await handler.delete('payee-1');
      expect(mockDeletePayee).toHaveBeenCalledWith('payee-1');
    });
  });

  describe('validate', () => {
    it('does not throw for create with data', () => {
      expect(() => handler.validate('create', undefined, { name: 'X' })).not.toThrow();
    });

    it('throws when id missing for update', () => {
      expect(() => handler.validate('update', undefined, { name: 'X' })).toThrow();
    });

    it('throws when data missing for create', () => {
      expect(() => handler.validate('create', undefined, undefined)).toThrow();
    });

    it('does not throw for delete with id', () => {
      expect(() => handler.validate('delete', 'payee-1', undefined)).not.toThrow();
    });
  });

  describe('invalidateCache', () => {
    it('invalidates payees:all', () => {
      handler.invalidateCache();
      expect(mockCacheInvalidate).toHaveBeenCalledWith('payees:all');
    });
  });
});
