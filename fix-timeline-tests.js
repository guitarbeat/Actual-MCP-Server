const fs = require('fs');
const path = require('path');

const timelineTestPath = path.join(__dirname, 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts');
if (fs.existsSync(timelineTestPath)) {
  let content = fs.readFileSync(timelineTestPath, 'utf8');

  // Fix Map<any, any> -> Record<string, Category>
  content = content.replace(/new Map\(\)/g, '{}');

  // Fix Map<string, {...}> -> Record<string, Category>
  content = content.replace(/new Map\(\[\n\s*\[\n\s*'cat1',\n\s*{\n\s*id: 'cat1',\n\s*name: 'Category 1',\n\s*is_income: false,\n\s*},\n\s*\],\n\s*\]\)/g, "{ 'cat1': { id: 'cat1', name: 'Category 1', is_income: false } as any }");

  // Fix amountCents -> amount
  content = content.replace(/amountCents:/g, 'amount:');

  // Fix TimelineReconPaths missing properties
  content = content.replace(/baseDir: string;/g, 'baseDir: string; repoRoot: string; reconDir: string; timelinePath: string; candidatesPath: string; manualReviewPath: string;');
  const pathsFixStr = `repoRoot: '', reconDir: '', timelinePath: '', candidatesPath: '', manualReviewPath: '', `;
  content = content.replace(/\{ baseDir: '\/tmp'/g, `{ baseDir: '/tmp', ${pathsFixStr}`);

  // Fix placeCache
  content = content.replace(/placeCache: undefined/g, 'placeCache: {} as any');

  // Fix '"payee" | "imported_payee" | undefined' null assignment
  content = content.replace(/field: null/g, 'field: undefined');
  content = content.replace(/matchedValue: null/g, 'matchedValue: undefined');

  // Fix is_hidden -> hidden
  content = content.replace(/is_hidden:/g, 'hidden:');

  // Fix TransactionFetchResult
  content = content.replace(/\{ transactions: \[\] \}/g, '{ transactions: [], successfulAccountIds: [], warnings: [] }');

  fs.writeFileSync(timelineTestPath, content, 'utf8');
}
