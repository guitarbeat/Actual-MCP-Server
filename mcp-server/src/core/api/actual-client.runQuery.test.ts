
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import api from '@actual-app/api';

// Mock fs and os
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
  },
}));

vi.mock('node:os', () => ({
  default: {
    homedir: vi.fn().mockReturnValue('/tmp'),
  },
}));

// Mock api
vi.mock('@actual-app/api', () => {
  const send = vi.fn().mockResolvedValue('success');
  return {
    default: {
      init: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
      getBudgets: vi.fn().mockResolvedValue([{ id: 'budget1', cloudFileId: 'budget1' }]),
      downloadBudget: vi.fn().mockResolvedValue(undefined),
      getAccounts: vi.fn().mockResolvedValue([]), // For health check
      internal: {
        send,
      },
    },
  };
});

// Import after mocking
import { runQuery, initActualApi, shutdownActualApi } from './actual-client.js';

describe('runQuery', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.ACTUAL_SERVER_URL = 'http://localhost:5006';
    process.env.ACTUAL_PASSWORD = 'password';
    process.env.ACTUAL_BUDGET_SYNC_ID = 'budget1';

    // Initialize to set initialized = true
    await initActualApi();
  });

  afterEach(async () => {
    await shutdownActualApi();
  });

  it('should parse JSON query and call api.internal.send', async () => {
    const query = JSON.stringify({ table: 'transactions', select: ['id'] });

    const result = await runQuery(query);

    expect(api.internal.send).toHaveBeenCalledWith('api/query', {
      query: { table: 'transactions', select: ['id'] },
    });
    expect(result).toBe('success');
  });

  it('should throw error for invalid JSON', async () => {
    const query = 'invalid json';

    await expect(runQuery(query)).rejects.toThrow('Invalid query format. Expected JSON string');
    expect(api.internal.send).not.toHaveBeenCalled();
  });
});
