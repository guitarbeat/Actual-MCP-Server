import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './index.js';

const mockApi = vi.hoisted(() => ({
  runBankSync: vi.fn(),
}));

vi.mock('../../../actual-api.js', () => mockApi);

describe('import-transactions tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bank sync operation', () => {
    it('should sync all bank accounts when accountId is omitted', async () => {
      mockApi.runBankSync.mockResolvedValue(undefined);

      const response = await handler({
        source: 'bank',
      });

      expect(mockApi.runBankSync).toHaveBeenCalledWith(undefined);
      expect(response.isError).toBeUndefined();
      const data = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(data).toContain('Successfully synced all bank accounts');
    });

    it('should sync specific account when accountId is provided', async () => {
      mockApi.runBankSync.mockResolvedValue(undefined);

      const response = await handler({
        source: 'bank',
        accountId: 'acc-123',
      });

      expect(mockApi.runBankSync).toHaveBeenCalledWith('acc-123');
      expect(response.isError).toBeUndefined();
      const data = JSON.parse((response.content?.[0] as { text: string }).text);
      expect(data).toContain('Successfully synced bank account');
      expect(data).toContain('acc-123');
    });

    it('should ignore non-string accountId', async () => {
      mockApi.runBankSync.mockResolvedValue(undefined);

      const response = await handler({
        source: 'bank',
        accountId: 123,
      });

      expect(mockApi.runBankSync).toHaveBeenCalledWith(undefined);
      expect(response.isError).toBeUndefined();
    });

    it('should handle API errors', async () => {
      mockApi.runBankSync.mockRejectedValue(new Error('Sync failed'));

      const response = await handler({
        source: 'bank',
      });

      expect(response.isError).toBe(true);
    });
  });

  describe('validation errors', () => {
    it('should return error when source is missing', async () => {
      const response = await handler({});

      expect(response.isError).toBe(true);
      expect(mockApi.runBankSync).not.toHaveBeenCalled();
    });

    it('should return error when source is invalid', async () => {
      const response = await handler({
        source: 'invalid',
      });

      expect(response.isError).toBe(true);
      expect(mockApi.runBankSync).not.toHaveBeenCalled();
    });

    it('should return error when source is "file"', async () => {
      const response = await handler({
        source: 'file',
      });

      expect(response.isError).toBe(true);
      expect(mockApi.runBankSync).not.toHaveBeenCalled();
    });
  });
});
