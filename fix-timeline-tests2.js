const fs = require('fs');
const path = require('path');

const timelineTestPath = path.join(__dirname, 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts');
let content = fs.readFileSync(timelineTestPath, 'utf8');

// The type errors complain about Map<any, any> not assignable to Record<string, Category>
content = content.replace(/new Map<any, any>\(\)/g, '{}');
content = content.replace(/new Map\(\)/g, '{}');

// Fix Map to Record mapping
content = content.replace(/new Map\(\[\n\s*\[\n\s*'cat1',\n\s*{\n\s*id: 'cat1',\n\s*name: 'Category 1',\n\s*is_income: false,\n\s*},\n\s*\],\n\s*\]\)/g,
  "{ 'cat1': { id: 'cat1', name: 'Category 1', is_income: false } as any }");

// Fix amountCents -> amount in Transaction
content = content.replace(/amountCents:/g, 'amount:');

// Fix TimelineReconPaths
content = content.replace(/const paths = \{\n      baseDir: '\/tmp',\n      auditPath: '\/tmp\/audit\.json',\n      supplementalCsvPath: '\/tmp\/supp\.csv',\n      placeCachePath: '\/tmp\/places\.json',\n      categoryOverridesPath: '\/tmp\/overrides\.json',\n      manualReviewCsvPath: '\/tmp\/manual\.csv',\n      candidatesCsvPath: '\/tmp\/candidates\.csv',\n      locationHistoryPath: '\/tmp\/location\.json',\n    \};/g,
  "const paths: any = {\n      baseDir: '/tmp',\n      auditPath: '/tmp/audit.json',\n      supplementalCsvPath: '/tmp/supp.csv',\n      placeCachePath: '/tmp/places.json',\n      categoryOverridesPath: '/tmp/overrides.json',\n      manualReviewCsvPath: '/tmp/manual.csv',\n      candidatesCsvPath: '/tmp/candidates.csv',\n      locationHistoryPath: '/tmp/location.json',\n    };");

// Fix placeCache missing properties
content = content.replace(/placeCache: undefined,/g, 'placeCache: undefined as any,');

// Fix "payee" | "imported_payee" | undefined null assignment
content = content.replace(/field: null,/g, 'field: undefined,');
content = content.replace(/matchedValue: null,/g, 'matchedValue: undefined,');

// Fix is_hidden -> hidden
content = content.replace(/is_hidden:/g, 'hidden:');

// Fix TransactionFetchResult missing fields
content = content.replace(/\{ transactions: \[\] \}/g, '{ transactions: [], successfulAccountIds: [], warnings: [] }');

fs.writeFileSync(timelineTestPath, content, 'utf8');
