const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// fix payeeName -> payee_name
content = content.replace(/payeeName: /g, 'payee_name: ');

// fix Category missing group_id
content = content.replace(/{ 'c1': { id: 'c1', name: 'Test Category', is_income: false } }/g, "{ 'c1': { id: 'c1', name: 'Test Category', is_income: false, group_id: 'g1' } }");

// placeCache -> ensure placeCache and categoryOverrides are not undefined in BuildTimelineReconAuditInput
// This is because input variable is just casted or provided directly. We just make sure we provide them as empty.
// wait, line 150 is the generateTimelineReconAudit test.
content = content.replace(
  /const mockInput = {\n\s+transactions: \[\],\n\s+accounts: \[\],\n\s+categoriesById: \{\},\n\s+supplementalRows: \[\],\n\s+timeline: \{ stays: \[\], activities: \[\] \},\n\s+};/,
  `const mockInput = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        transactions: [],
        accounts: [],
        categoriesById: {},
        supplementalRows: [],
        timeline: { stays: [], activities: [] },
        placeCache: { places: {} },
        categoryOverrides: { transactions: {}, merchantNames: {}, placeKeys: {} }
      };`
);


// fix remaining nulls on line 209, 210, 332, 333, 404, 405 for payee fields
// Specifically they might be transfer_id, or category, or something else since we already replaced 'importedPayee' and 'payee'.
// Let's use regex to find `null` in those areas and replace them. But let's be more specific. Let's look for matchField and matchValue
content = content.replace(/matchField: null/g, 'matchField: undefined');
content = content.replace(/matchValue: null/g, 'matchValue: undefined');

// fix TransactionFetchResult
content = content.replace(/transactions: \[\] \}/g, 'transactions: [], successfulAccountIds: [], warnings: [] }');


// fix Map to {} for currentTransactions map. In the previous fix we changed `new Map()` to `{}`, but some of those were arguments to a function expecting a Map!
// line 347 and 420:
// applySupportModule.buildCurrentTransactionsMap(..., {})
content = content.replace(/buildCurrentTransactionsMap\(([^,]+),\s*\{\}\)/g, 'buildCurrentTransactionsMap($1, new Map())');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixes applied to ' + path);
