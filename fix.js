const fs = require('fs');

const p = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/const currentTransactionsById = new Map<string, any>\(\) as any;/g,
  "const currentTransactionsById = new Map<string, any>();");

// Actually, let's fix the test logic. `applyTimelineReconAudit` fetches transactions, then builds a Map.
// Our `actualClientModule.getTransactionsForRecon` mock returns `{ transactions: [] }`.
// Wait, the transactions array in the mock is `[]` !!
// Look at `vi.mocked(fetchTransactionsModule.fetchAllOnBudgetTransactionsWithMetadata).mockResolvedValue({ transactions: [] } as any);`
// If transactions is [], then `currentTransactionsById` will be empty!
// Wait! `mockCurrentTransaction` was used for `buildCurrentTransactionMap` mock!
// Let me look at line 240:
c = c.replace(/\{ transactions: \[\] \} as any,\n      \);\n\n      const mockCurrentTransaction/g,
  "{ transactions: [{ id: 't1', account_id: 'a1', amount: 1500, date: '2025-01-15' }] } as any,\n      );\n\n      const mockCurrentTransaction");

fs.writeFileSync(p, c, 'utf8');
