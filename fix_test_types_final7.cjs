const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// The file is restored again. I will do this slowly and carefully with exact string matches.

// 1. Line 73, 111: `Map` to `Record`
content = content.replace("categoriesById: new Map(),", "categoriesById: {} as any,");
content = content.replace("categoriesById: new Map([['c1', { id: 'c1', name: 'Test Category', is_income: false }]]),", "categoriesById: { 'c1': { id: 'c1', name: 'Test Category', is_income: false, group_id: 'g1' } } as any,");


// 2. Line 97: `amountCents` -> `amount`
// We will replace only the fields inside the `transactions: [{ ... }]` block in `buildTimelineReconAudit`
content = content.replace(
  `amountCents: 1500,
            payeeName: 'Test Payee',
            accountId: 'a1',
            accountName: 'Test Account',
            importedPayee: 'Imported Test Payee',
            notes: 'Test Note',
            transferId: null,
            isParent: false,
            isChild: false,
            categoryName: null,
            category: null,`,
  `amount: 1500,
            payee_name: 'Test Payee',
            account: 'a1',
            account_name: 'Test Account',
            imported_payee: 'Imported Test Payee',
            notes: 'Test Note',
            transfer_id: undefined,
            is_parent: false,
            is_child: false,
            category_name: undefined,
            category: undefined,`
);

// 3. Line 140, 174, 248, 274, 279, 295, 349, 366, 421: TimelineReconPaths
const oldPaths = `const paths = {
        baseDir: '/test',
        auditPath: '/test/audit.json',
        supplementalCsvPath: '',
        placeCachePath: '',
        categoryOverridesPath: '',
        manualReviewCsvPath: '',
        candidatesCsvPath: '',
        locationHistoryPath: '',
      };`;
const newPaths = `const paths = {
        repoRoot: '/test',
        reconDir: '/test/recon',
        auditPath: '/test/recon/audit.json',
        supplementalCsvPath: '/test/recon/supplemental.csv',
        placeCachePath: '/test/recon/placeCache.json',
        categoryOverridesPath: '/test/recon/categoryOverrides.json',
        manualReviewPath: '/test/recon/manualReview.csv',
        candidatesPath: '/test/recon/candidates.csv',
        timelinePath: '/test/recon/timeline.json',
      } as any;`;

content = content.split(oldPaths).join(newPaths); // Replace all occurrences exactly


// 4. Line 150: generateTimelineReconAudit missing placeCache
content = content.replace(
  `const mockInput = {
        transactions: [],
        accounts: [],
        categoriesById: new Map(),
        supplementalRows: [],
        timeline: { stays: [], activities: [] },
      };`,
  `const mockInput: any = {
        transactions: [],
        accounts: [],
        categoriesById: {},
        supplementalRows: [],
        timeline: { stays: [], activities: [] },
        placeCache: { places: {} },
        categoryOverrides: { transactions: {}, merchantNames: {}, placeKeys: {} }
      };`
);


// 5. Line 207, 328, 399: null matchField
content = content.replace(/matchField: null,/g, "matchField: undefined,");
content = content.replace(/matchValue: null,/g, "matchValue: undefined,");

// 6. Line 220, 341, 412: TransactionFetchResult missing successfulAccountIds, warnings
content = content.replace(
  `transactions: [],
      });`,
  `transactions: [],
        successfulAccountIds: [],
        warnings: []
      });`
);

// 7. Line 243, 345, 417: is_hidden -> hidden
content = content.replace(/is_hidden: false,/g, "hidden: false,");

// 8. Line 347, 420: applySupportModule.buildCurrentTransactionsMap([mockTx], {})
content = content.replace(/buildCurrentTransactionsMap\(\[mockTx\], \{\}\)/g, "buildCurrentTransactionsMap([mockTx], new Map())");


fs.writeFileSync(path, content, 'utf8');
