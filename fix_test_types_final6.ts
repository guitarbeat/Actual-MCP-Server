import * as fs from 'fs';

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// The file is restored, let's just make it completely valid.

// Line 73, 111: `Map` to `Record`
content = content.replace(/categoriesById: new Map\(\),/g, "categoriesById: {},");
content = content.replace(/categoriesById: new Map\(\[\['c1', \{ id: 'c1', name: 'Test Category', is_income: false \}\]\]\),/g, "categoriesById: { 'c1': { id: 'c1', name: 'Test Category', is_income: false, group_id: 'g1' } as any },");

// Line 97: `amountCents` -> `amount`
// Only in `transactions` array! The candidates have `transactionAmountCents` so that is fine.
content = content.replace(/amountCents: 1500,/g, "amount: 1500,");
content = content.replace(/payeeName: 'Test Payee',/g, "payee_name: 'Test Payee',");
content = content.replace(/accountId: 'a1',/g, "account: 'a1',");
content = content.replace(/accountName: 'Test Account',/g, "account_name: 'Test Account',");
content = content.replace(/importedPayee: 'Imported Test Payee',/g, "imported_payee: 'Imported Test Payee',");
content = content.replace(/transferId: null,/g, "transfer_id: undefined,");
content = content.replace(/isParent: false,/g, "is_parent: false,");
content = content.replace(/isChild: false,/g, "is_child: false,");
content = content.replace(/categoryName: null,/g, "category_name: undefined,");
content = content.replace(/category: null,/g, "category: undefined,");

// Line 140, 174, 248, 274, 279, 295, 349, 366, 421: TimelineReconPaths
const newPaths = `{
        repoRoot: '/test',
        reconDir: '/test/recon',
        auditPath: '/test/recon/audit.json',
        supplementalCsvPath: '/test/recon/supplemental.csv',
        placeCachePath: '/test/recon/placeCache.json',
        categoryOverridesPath: '/test/recon/categoryOverrides.json',
        manualReviewPath: '/test/recon/manualReview.csv',
        candidatesPath: '/test/recon/candidates.csv',
        timelinePath: '/test/recon/timeline.json',
      }`;
content = content.replace(/const paths = \{[^}]*\};/g, `const paths = ${newPaths};`);


// Line 150: generateTimelineReconAudit missing placeCache
content = content.replace(/const mockInput = \{\n\s*transactions:/g, `const mockInput: any = {\n        transactions:`);

// Line 207, 328, 399: null matchField
content = content.replace(/matchField: null/g, "matchField: undefined");
content = content.replace(/matchValue: null/g, "matchValue: undefined");

// Line 220, 341, 412: TransactionFetchResult missing successfulAccountIds, warnings
content = content.replace(/transactions: \[\],\n\s+\}\);/g, "transactions: [], successfulAccountIds: [], warnings: [] });");

// Line 243, 345, 417: is_hidden -> hidden
content = content.replace(/is_hidden:/g, "hidden:");

// Line 347, 420: applySupportModule.buildCurrentTransactionsMap([mockTx], {})
content = content.replace(/buildCurrentTransactionsMap\(\[mockTx\], \{\}\)/g, "buildCurrentTransactionsMap([mockTx], new Map())");


fs.writeFileSync(path, content, 'utf8');
