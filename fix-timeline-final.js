const fs = require('fs');

const p = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let c = fs.readFileSync(p, 'utf8');

// The main issue with `currentTransactionsById.get is not a function`
// is that `actualClientModule.getTransactionsForRecon()` returns an object with `{ transactions: [] }` which doesn't match the signature!
// wait, the signature in `internal.ts` for `actualClientModule.getTransactionsForRecon` might return a `{ transactions }` object,
// and `buildCurrentTransactionMap(transactions)` receives that array.
// Let's just fix the types safely without breaking the runtime mock structure!
c = c.replace(/import type \{ Transaction \} from '@actual-app\/api\/@types\/loot-core\/src\/server\/api-models';/g,
  "import type { Transaction } from '@actual-app/api/@types/loot-core/src/server/api-models';\ntype PartialTransaction = any; // Bypass strict checks in tests");

// Just replace `Transaction[]` with `PartialTransaction[]` in the mocks.
c = c.replace(/const transactions: Transaction\[\] = \[/g, "const transactions: PartialTransaction[] = [");
c = c.replace(/as unknown as Transaction\[\]/g, "as unknown as PartialTransaction[]");

c = c.replace(/const categoriesById = new Map<string, any>\(\);/g, "const categoriesById = new Map<string, any>() as any;");
c = c.replace(/const categoriesById = new Map\(\[\n/g, "const categoriesById = new Map([\n");
c = c.replace(/is_income: false,\n        },\n      \],\n    \]\);/g, "is_income: false,\n        },\n      ],\n    ]) as any;");

c = c.replace(/amountCents:/g, "amount:");
c = c.replace(/accountName:/g, "account_name:");
c = c.replace(/accountId:/g, "account:");
c = c.replace(/payeeName:/g, "payee_name:");
c = c.replace(/importedPayee:/g, "imported_payee:");
c = c.replace(/isParent:/g, "is_parent:");
c = c.replace(/isChild:/g, "is_child:");
c = c.replace(/startingBalanceFlag:/g, "starting_balance_flag:");
c = c.replace(/transferId:/g, "transfer_id:");

c = c.replace(/field: null/g, "field: undefined as any");
c = c.replace(/matchedValue: null/g, "matchedValue: undefined as any");
c = c.replace(/is_hidden:/g, "hidden:");

// TimelineReconPaths properties
c = c.replace(/const paths = \{\n      baseDir: '\/tmp',/g, "const paths: any = {\n      baseDir: '/tmp',");

c = c.replace(/placeCache: undefined,/g, 'placeCache: undefined as any,');

// Restore the `transactionSnapshots` that was failing
c = c.replace(/transactionSnapshots: new Map<string, any>\(\)/g, "transactionSnapshots: new Map() as any");
c = c.replace(/transactionSnapshots: \{\}/g, "transactionSnapshots: new Map() as any");
c = c.replace(/\{ transactions: \[\] \}/g, "{ transactions: [] } as any");

fs.writeFileSync(p, c, 'utf8');
