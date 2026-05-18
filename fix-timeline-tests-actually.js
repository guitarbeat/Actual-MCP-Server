const fs = require('fs');
const path = require('path');

const timelineTestPath = path.join(__dirname, 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts');
if (fs.existsSync(timelineTestPath)) {
  let content = fs.readFileSync(timelineTestPath, 'utf8');

  // Fix Map<any, any> -> Record<string, Category> using type assertion
  content = content.replace(/new Map<any, any>\(\)/g, "({} as any)");

  // Replace the specific new Map initialization
  content = content.replace(/new Map\(\[\n\s*\[\n\s*'cat1',\n\s*{\n\s*id: 'cat1',\n\s*name: 'Category 1',\n\s*is_income: false,\n\s*},\n\s*\],\n\s*\]\)/g,
    "({ 'cat1': { id: 'cat1', name: 'Category 1', is_income: false } as any })");

  // Fix amountCents -> amount
  content = content.replace(/amountCents:/g, "amount:");

  // Fix is_hidden -> hidden
  content = content.replace(/is_hidden:/g, 'hidden:');

  // Add paths properties
  const fullPaths = "baseDir: '/tmp', repoRoot: '', reconDir: '', timelinePath: '', candidatesPath: '', manualReviewPath: '', ";
  content = content.replace(/baseDir: '\/tmp',/g, fullPaths);

  // Fix placeCache
  content = content.replace(/placeCache: undefined/g, 'placeCache: undefined as any');

  // Fix null -> undefined for field/matchedValue
  content = content.replace(/field: null/g, 'field: undefined');
  content = content.replace(/matchedValue: null/g, 'matchedValue: undefined');

  // Fix { transactions: [] }
  content = content.replace(/\{ transactions: \[\] \}/g, '{ transactions: [], successfulAccountIds: [], warnings: [] }');

  // Add missing properties in the rest
  content = content.replace(/new Map<string, any>\(\)/g, "({} as any)");

  fs.writeFileSync(timelineTestPath, content, 'utf8');
}
