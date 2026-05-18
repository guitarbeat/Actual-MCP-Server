const fs = require('fs');
const path = require('path');

const timelineTestPath = path.join(__dirname, 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts');
if (fs.existsSync(timelineTestPath)) {
  let content = fs.readFileSync(timelineTestPath, 'utf8');

  // Fix accountName
  content = content.replace(/accountName:/g, 'account_name:');

  // Fix Map<string, { id: string; name: string; is_income: boolean; }> to any
  content = content.replace(/const categoriesById = new Map\(\[\n/g, 'const categoriesById = new Map([\n')
         .replace(/\]\);/g, ']) as any;');

  // placeCache: undefined
  content = content.replace(/placeCache: undefined/g, 'placeCache: undefined as any');

  // nulls
  content = content.replace(/field: null/g, 'field: undefined as any');
  content = content.replace(/matchedValue: null/g, 'matchedValue: undefined as any');

  // transactionSnapshots
  content = content.replace(/transactionSnapshots: \{\}/g, 'transactionSnapshots: {} as any');

  fs.writeFileSync(timelineTestPath, content, 'utf8');
}
