import { describe, it, expect, vi } from 'vitest';
import { getHistoricalTransferInternalLayer } from './historical-transfers.js';
import type { ExtendedActualApi } from './types.js';

describe('getHistoricalTransferInternalLayer', () => {
  it('should return send and db when all required internal properties are present', () => {
    const mockSend = vi.fn();
    const mockDb = {
      getTransaction: vi.fn(),
      all: vi.fn(),
    };

    const extendedApi = {
      internal: {
        send: mockSend,
        db: mockDb as unknown,
      },
    } as ExtendedActualApi;

    const result = getHistoricalTransferInternalLayer(extendedApi);

    expect(result.send).toBe(mockSend);
    expect(result.db).toBe(mockDb);
  });

  it('should throw an error when internal is missing', () => {
    const extendedApi = {} as ExtendedActualApi;

    expect(() => getHistoricalTransferInternalLayer(extendedApi)).toThrow(
      'Historical transfer tools require Actual local data access',
    );
  });

  it('should throw an error when internal.send is missing', () => {
    const extendedApi = {
      internal: {
        db: {
          getTransaction: vi.fn(),
          all: vi.fn(),
        } as unknown,
      },
    } as ExtendedActualApi;

    expect(() => getHistoricalTransferInternalLayer(extendedApi)).toThrow(
      'Historical transfer tools require Actual local data access',
    );
  });

  it('should throw an error when internal.db is missing', () => {
    const extendedApi = {
      internal: {
        send: vi.fn(),
      },
    } as ExtendedActualApi;

    expect(() => getHistoricalTransferInternalLayer(extendedApi)).toThrow(
      'Historical transfer tools require Actual local data access',
    );
  });

  it('should throw an error when internal.db.getTransaction is missing', () => {
    const extendedApi = {
      internal: {
        send: vi.fn(),
        db: {
          all: vi.fn(),
        } as unknown,
      },
    } as ExtendedActualApi;

    expect(() => getHistoricalTransferInternalLayer(extendedApi)).toThrow(
      'Historical transfer tools require Actual local data access',
    );
  });

  it('should throw an error when internal.db.all is missing', () => {
    const extendedApi = {
      internal: {
        send: vi.fn(),
        db: {
          getTransaction: vi.fn(),
        } as unknown,
      },
    } as ExtendedActualApi;

    expect(() => getHistoricalTransferInternalLayer(extendedApi)).toThrow(
      'Historical transfer tools require Actual local data access',
    );
  });
});
