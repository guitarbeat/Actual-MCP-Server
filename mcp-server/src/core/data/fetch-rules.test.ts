import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { RuleEntity } from '@actual-app/api/@types/loot-core/src/types/models/rule.js';
import { getRules } from '../../core/api/actual-client.js';
import { fetchAllRules } from './fetch-rules.js';

vi.mock('../../core/api/actual-client.js');

describe('fetchAllRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return rules when getRules succeeds', async () => {
    const mockRules: RuleEntity[] = [
      { id: '1', stage: 'pre', conditionsOp: 'and', conditions: [], actions: [] },
      { id: '2', stage: 'pre', conditionsOp: 'or', conditions: [], actions: [] },
    ];

    vi.mocked(getRules).mockResolvedValueOnce(mockRules);

    const result = await fetchAllRules();

    expect(result).toEqual(mockRules);
    expect(getRules).toHaveBeenCalledTimes(1);
  });

  it('should throw an error when getRules fails', async () => {
    const mockError = new Error('Database connection failed');
    vi.mocked(getRules).mockRejectedValueOnce(mockError);

    await expect(fetchAllRules()).rejects.toThrow('Database connection failed');
    expect(getRules).toHaveBeenCalledTimes(1);
  });
});
