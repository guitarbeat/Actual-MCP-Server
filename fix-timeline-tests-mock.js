const fs = require('fs');
const path = require('path');

const timelineTestPath = path.join(__dirname, 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts');
if (fs.existsSync(timelineTestPath)) {
  let content = fs.readFileSync(timelineTestPath, 'utf8');

  // Let's go look at how transactions are mocked when read.
  // The error says "currentTransactionsById.get is not a function".
  // This means the code in `internal.ts` creates `currentTransactionsById` from `transactions`.
  // Wait, `transactions` is just an array, but `buildCurrentTransactionMap` returns a Map. Let's make sure our mock transactions don't break `buildCurrentTransactionMap`.
  // Actually, we mocked `actualClientModule.getTransactionsForRecon = vi.fn().mockResolvedValue({ transactions });`
  // And `applyTimelineReconAudit` reads from the file. Oh, wait, the transactions are read from `transactions` array.
  // No, `applyTimelineReconAudit` calls `actualClientModule.getTransactionsForRecon`.
  // Wait, `currentTransactionsById` is a `Map` that is built by `buildCurrentTransactionMap`. Let's restore the original `transactions` and `categoriesById`. I messed up the mock data.

  content = content.replace(/const transactions = \[/g, 'const transactions: any[] = [');
  content = content.replace(/\] as unknown as Transaction\[\];/g, '];');
  content = content.replace(/const categoriesById = new Map<string, any>\(\) as unknown as Record<string, Category>;/g, 'const categoriesById = new Map<string, any>();');
  content = content.replace(/const categoriesById: any = new Map<string, any>\(\);/g, 'const categoriesById = new Map<string, any>();');

  content = content.replace(/const categoriesById = new Map\(\[\n/g, 'const categoriesById: any = new Map([\n');
  content = content.replace(/\]\);/g, ']);');
  content = content.replace(/\]\) as unknown as Record<string, Category>;/g, ']);');

  content = content.replace(/const paths: any = \{/g, 'const paths: any = {');

  // The reason `get` failed is because `applyTimelineReconAudit` expects `transactions` to have certain fields or maybe I broke the mock.

  fs.writeFileSync(timelineTestPath, content, 'utf8');
}
