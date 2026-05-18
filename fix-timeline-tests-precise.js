const fs = require('fs');
const path = require('path');

const timelineTestPath = path.join(__dirname, 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts');
if (fs.existsSync(timelineTestPath)) {
  let content = fs.readFileSync(timelineTestPath, 'utf8');

  // Fix 1: TimelineReconPaths missing properties
  content = content.replace(
    /const paths = \{\n      baseDir: '\/tmp',/,
    "const paths = {\n      baseDir: '/tmp',\n      repoRoot: '',\n      reconDir: '',\n      timelinePath: '',\n      candidatesPath: '',\n      manualReviewPath: '',"
  );

  // Fix 2: placeCache: undefined -> TimelinePlaceCacheFile
  content = content.replace(/placeCache: undefined,/g, 'placeCache: undefined as any,');

  // Fix 3: categoriesById type
  content = content.replace(/const categoriesById = new Map<string, any>\(\);/g, 'const categoriesById = new Map<string, any>() as any;');
  content = content.replace(/const categoriesById = new Map\(\[\n/g, 'const categoriesById = new Map([\n');
  content = content.replace(/is_income: false,\n        },\n      \],\n    \]\);/g, 'is_income: false,\n        },\n      ],\n    ]) as any;');

  // Fix 4: Transaction properties
  content = content.replace(/amountCents:/g, 'amount:');
  content = content.replace(/payeeName:/g, 'payee_name:');
  content = content.replace(/accountId:/g, 'account:');
  content = content.replace(/accountName:/g, 'account_name:');
  content = content.replace(/importedPayee:/g, 'imported_payee:');
  content = content.replace(/transferId:/g, 'transfer_id:');
  content = content.replace(/isParent:/g, 'is_parent:');
  content = content.replace(/isChild:/g, 'is_child:');
  content = content.replace(/startingBalanceFlag:/g, 'starting_balance_flag:');

  // Fix 5: field / matchedValue null to undefined
  content = content.replace(/field: null,/g, 'field: undefined as any,');
  content = content.replace(/matchedValue: null,/g, 'matchedValue: undefined as any,');

  // Fix 6: is_hidden
  content = content.replace(/is_hidden:/g, 'hidden:');

  // Fix 7: TransactionFetchResult
  content = content.replace(/\{ transactions: \[\] \}/g, '{ transactions: [], successfulAccountIds: [], warnings: [] }');

  fs.writeFileSync(timelineTestPath, content, 'utf8');
}
