import { describe, it, afterEach, vi } from 'vitest';
import { prepareImportTransactionBatches } from './data-fetcher.js';
import { nameResolver } from '../../../core/utils/name-resolver.js';

describe('Performance benchmark', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('measures prepareImportTransactionBatches', async () => {
    const originalResolveAccount = nameResolver.resolveAccount;
    const originalResolvePayee = nameResolver.resolvePayee;
    const originalResolveCategory = nameResolver.resolveCategory;

    nameResolver.resolveAccount = async (ref: string) => {
      await new Promise(r => setTimeout(r, 10));
      return `account_${ref}`;
    };
    nameResolver.resolvePayee = async (ref: string) => `payee_${ref}`;
    nameResolver.resolveCategory = async (ref: string) => `category_${ref}`;

    const transactions = [];
    const numAccounts = 50;
    for (let i = 0; i < numAccounts; i++) {
      for (let j = 0; j < 10; j++) {
        transactions.push({
          accountId: `acc_${i}`,
          date: '2023-01-01',
          amount: 1000,
          payee: `payee_${j}`,
        });
      }
    }

    const start = Date.now();
    await prepareImportTransactionBatches(transactions as any);
    const end = Date.now();
    console.log(`Time taken: ${end - start} ms`);

    nameResolver.resolveAccount = originalResolveAccount;
    nameResolver.resolvePayee = originalResolvePayee;
    nameResolver.resolveCategory = originalResolveCategory;
  });
});
