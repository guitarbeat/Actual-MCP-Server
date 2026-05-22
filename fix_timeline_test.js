const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix line 73: Map<any, any> to Record<string, Category> in Object.fromEntries format
// Actually, it's categoriesById. The type expects Record<string, Category> instead of Map.
content = content.replace(
  'categoriesById: new Map(),',
  'categoriesById: {},'
);

// 2. Fix line 97: amountCents to amount
content = content.replace(
  'amountCents: 1500,',
  'amount: 1500,'
);

// 3. Fix line 111: new Map([['c1', ...]]) to { c1: { ... } }
content = content.replace(
  "categoriesById: new Map([['c1', { id: 'c1', name: 'Test Category', is_income: false }]]),",
  "categoriesById: { c1: { id: 'c1', name: 'Test Category', is_income: false, hidden: false, group_id: 'g1' } },"
);

// 4. Fix lines 140, 174, 248, 274, 279, 295, 349, 366, 421: TimelineReconPaths properties
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
        reconDir: '/test',
        auditPath: '/test/audit.json',
        supplementalCsvPath: '',
        timelinePath: '',
        placeCachePath: '',
        categoryOverridesPath: '',
        candidatesPath: '',
        manualReviewPath: '',
        locationHistoryPath: '',
      };`;

content = content.split(oldPaths).join(newPaths);

// 5. Fix line 150: mockInput missing placeCache
content = content.replace(
  /const mockInput = {\n\s+transactions: \[\],\n\s+accounts: \[\],\n\s+categoriesById: new Map\(\),\n\s+supplementalRows: \[\],\n\s+timeline: { stays: \[\], activities: \[\] },\n\s+};/g,
  `const mockInput = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        transactions: [],
        accounts: [],
        categoriesById: {},
        supplementalRows: [],
        timeline: { stays: [], activities: [] },
        placeCache: { places: {} },
        categoryOverrides: { transactions: {}, merchantNames: {}, placeKeys: {} },
      };`
);

// 6. Fix line 207, 208, 328, 329, 399, 400: Type 'null' is not assignable to '"payee" | "imported_payee" | undefined' and 'string | undefined'
content = content.replace(/matchedPlaceKey: null,/g, 'matchedPlaceKey: undefined,');
content = content.replace(/matchedMerchant: null,/g, 'matchedMerchant: undefined,');
content = content.replace(/ruleField: null,/g, 'ruleField: undefined,');
content = content.replace(/ruleValue: null,/g, 'ruleValue: undefined,');
content = content.replace(/blockedReason: null,/g, 'blockedReason: undefined,');


// 7. Fix line 220, 341, 412: { transactions: never[]; } to full TransactionFetchResult
content = content.replace(
  /{ transactions: \[\] },/g,
  "{ transactions: [], successfulAccountIds: [], warnings: [] },"
);


// 8. Fix line 243, 345, 417: is_hidden to hidden
content = content.replace(
  /{ id: 'c1', name: 'Test Category', is_income: false, is_hidden: false, group_id: 'g1' },/g,
  "{ id: 'c1', name: 'Test Category', is_income: false, hidden: false, group_id: 'g1' },"
);


fs.writeFileSync(path, content);
