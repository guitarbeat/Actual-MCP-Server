import { describe, it, vi, beforeEach } from 'vitest';
import { NameResolver } from './name-resolver.js';
import { fetchAllAccounts } from '../data/fetch-accounts.js';
import type { Account } from '../types/domain.js';

vi.mock('../data/fetch-accounts.js', () => ({
  fetchAllAccounts: vi.fn(),
}));

describe('NameResolver N+1 Benchmark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('measures looking up missing entities multiple times', async () => {
    const resolver = new NameResolver();

    // Simulate fetchAllAccounts returning 1000 accounts and taking 10ms
    vi.mocked(fetchAllAccounts).mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10));
      const accounts: Account[] = [];
      for (let i = 0; i < 1000; i++) {
        accounts.push({ id: `acc-${i}`, name: `Account ${i}` } as Account);
      }
      return accounts;
    });

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      try {
        await resolver.resolveAccount(`Missing ${i}`);
      } catch (e) {
        // Expected to throw
      }
    }
    const duration = performance.now() - start;

    console.log(`Duration for 100 missing lookups: ${duration.toFixed(2)}ms`);
    console.log(`fetchAllAccounts called ${vi.mocked(fetchAllAccounts).mock.calls.length} times`);
  });
});
