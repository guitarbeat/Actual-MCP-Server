import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayeeHandler } from './payee-handler.js';
import * as actualApi from '../../../actual-api.js';

vi.mock('../../../actual-api.js');

describe('PayeeHandler', () => {
  let payeeHandler: PayeeHandler;

  beforeEach(() => {
    payeeHandler = new PayeeHandler();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a payee with valid data', async () => {
      const data = { name: 'Target' };
      const expectedId = 'new-payee-id';
      vi.mocked(actualApi.createPayee).mockResolvedValue(expectedId);

      const result = await payeeHandler.create(data);

      expect(actualApi.createPayee).toHaveBeenCalledWith(data);
      expect(result).toBe(expectedId);
    });
  });

  describe('update', () => {
    it('should update a payee with valid data', async () => {
      const id = 'payee-1';
      const data = { name: 'Target' };
      vi.mocked(actualApi.updatePayee).mockResolvedValue(undefined);

      await payeeHandler.update(id, data);

      expect(actualApi.updatePayee).toHaveBeenCalledWith(id, data);
    });
  });

  describe('delete', () => {
    it('should delete a payee by id', async () => {
      const id = 'payee-1';
      vi.mocked(actualApi.deletePayee).mockResolvedValue(undefined);

      await payeeHandler.delete(id);

      expect(actualApi.deletePayee).toHaveBeenCalledWith(id);
    });
  });

  describe('validate', () => {
    it('should throw an error if id is missing for update', () => {
      expect(() => payeeHandler.validate('update', undefined, {})).toThrow();
    });

    it('should throw an error if id is missing for delete', () => {
      expect(() => payeeHandler.validate('delete', undefined)).toThrow();
    });

    it('should throw an error if data is missing for create', () => {
      expect(() => payeeHandler.validate('create')).toThrow();
    });

    it('should throw an error if data is missing for update', () => {
      expect(() => payeeHandler.validate('update', 'some-id', undefined)).toThrow();
    });
  });
});
