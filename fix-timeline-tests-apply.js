const fs = require('fs');

const p = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let c = fs.readFileSync(p, 'utf8');

// I need to look at why `updateTransaction` is not called!
// Wait! I replaced:
// `{ transactions: [] } as any,`
// with
// `{ transactions: [{ id: 't1', account_id: 'a1', amount: 1500, date: '2025-01-15' }] } as any,`
// But in `internal.ts`, it builds the current transaction map and uses it.
// If it has `id: 't1'`, why is `updateTransaction` not called?
// Wait, the transaction id from the audit is `t1`.
// The candidate says `transactionId: 't1'`.
// Ah! In my `mockCurrentTransaction` map setup, I had:
// `new Map([['t1', mockCurrentTransaction]])`
// Did I remove that?
// No, I kept that in the file. Wait! My `fix.js` replaced `{ transactions: [] }` with `{ transactions: [...] }`
// but in `internal.ts` we have:
// `const currentTransactionsById = buildCurrentTransactionMap(transactions);`
// `buildCurrentTransactionMap` takes `transactions` and builds a map.
// If the mock `actualClientModule.getTransactionsForRecon` returns `{ transactions: [] }`, `transactions` is empty.
// Then `buildCurrentTransactionMap([])` returns an empty map!
// In the original test, `buildCurrentTransactionMap` was MOCKED!
// Ah! `vi.mocked(applySupportModule.buildCurrentTransactionMap).mockReturnValue(...)`
// But my regex replaced `vi.mocked(applySupportModule.buildCurrentTransactionMap).mockReturnValue(...)` ?
// No, the error `currentTransactionsById.get is not a function` happened when `buildCurrentTransactionMap` was mocked to return `{}` or something.
// Oh wait. I replaced `new Map<any, any>()` with `new Map() as any;`.

c = c.replace(/const currentTransactionsById = new Map<string, any>\(\);/g,
  "const currentTransactionsById = new Map<string, any>() as any;");

// Wait, the test error is just `expected "spy" to be called... Number of calls: 0`.
// Let's restore the whole test file and disable eslint rule.

fs.writeFileSync(p, c, 'utf8');
