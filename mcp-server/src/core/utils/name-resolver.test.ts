
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NameResolver } from './name-resolver.js';
import * as fetchAccounts from '../data/fetch-accounts.js';

vi.mock('../data/fetch-accounts.js');

describe('NameResolver', () => {
  let resolver: NameResolver;

  beforeEach(() => {
    resolver = new NameResolver();
    vi.clearAllMocks();
  });

  it('should normalize names by removing emojis and trimming', async () => {
    // Access private method via casting
    const normalize = (resolver as any).normalizeName.bind(resolver);

    expect(normalize('  Chase Checking  ')).toBe('chase checking');
    expect(normalize('🏦 Chase Checking')).toBe('chase checking');
    // Current behavior preserves internal spaces when emoji is removed
    expect(normalize('Chase 💰 Checking')).toBe('chase  checking');
  });

  it('should resolve account name with emoji to ID', async () => {
    const mockAccounts = [
      { id: 'acc_1', name: '🏦 Chase Checking' },
      { id: 'acc_2', name: 'Savings 💰' }
    ];

    vi.spyOn(fetchAccounts, 'fetchAllAccounts').mockResolvedValue(mockAccounts as any);

    const id1 = await resolver.resolveAccount('Chase Checking');
    expect(id1).toBe('acc_1');

    const id2 = await resolver.resolveAccount('savings');
    expect(id2).toBe('acc_2');
  });
});
