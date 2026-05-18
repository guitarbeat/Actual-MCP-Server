const fs = require('fs');
const path = require('path');

const timelineTestPath = path.join(__dirname, 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts');
if (fs.existsSync(timelineTestPath)) {
  let content = fs.readFileSync(timelineTestPath, 'utf8');

  // Let's replace 'null' with 'undefined' for 'field' and 'matchedValue' again
  // since the checkout undid it.
  content = content.replace(/field: null/g, 'field: undefined');
  content = content.replace(/matchedValue: null/g, 'matchedValue: undefined');

  // Fix Map<any, any> -> Record<string, Category>
  content = content.replace(/new Map<any, any>\(\)/g, '{}');
  content = content.replace(/new Map\(\)/g, 'new Map<string, any>()'); // Just make Map not error or change to {}
  content = content.replace(/const categoriesById = new Map<string, any>\(\);/g, 'const categoriesById: Record<string, any> = {};');
  content = content.replace(/const categoriesById = new Map\(\[\n\s*\[\n\s*'cat1',\n\s*{\n\s*id: 'cat1',\n\s*name: 'Category 1',\n\s*is_income: false,\n\s*},\n\s*\],\n\s*\]\);/g, "const categoriesById: Record<string, any> = { 'cat1': { id: 'cat1', name: 'Category 1', is_income: false } };");

  // Fix payeeName -> payee_name in Transaction
  content = content.replace(/payeeName:/g, 'payee_name:');

  // Fix amountCents -> amount
  content = content.replace(/amountCents:/g, 'amount:');

  // Fix TimelineReconPaths
  const pathsFixStr = `repoRoot: '', reconDir: '', timelinePath: '', candidatesPath: '', manualReviewPath: '', `;
  content = content.replace(/const paths = \{\n      baseDir: '\/tmp'/g, `const paths = {\n      baseDir: '/tmp', ${pathsFixStr}`);

  // Fix placeCache
  content = content.replace(/placeCache: undefined/g, 'placeCache: undefined as any');

  // Fix Map<string, CurrentTransactionSnapshot> issue when we pass {}
  content = content.replace(/transactionSnapshots: new Map<string, any>\(\)/g, 'transactionSnapshots: new Map()');

  // Fix is_hidden -> hidden
  content = content.replace(/is_hidden:/g, 'hidden:');

  // Fix TransactionFetchResult missing fields
  content = content.replace(/\{ transactions: \[\] \}/g, '{ transactions: [], successfulAccountIds: [], warnings: [] }');

  fs.writeFileSync(timelineTestPath, content, 'utf8');
}
