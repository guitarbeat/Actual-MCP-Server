const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// 9. payeeName to payee_name, accountName to account_name, importedPayee to imported_payee, categoryName to category_name, accountId to account
content = content.replace(/payeeName: 'Test Payee',/g, "payee_name: 'Test Payee',");
content = content.replace(/accountName: 'Test Account',/g, "account_name: 'Test Account',");
content = content.replace(/importedPayee: 'Imported Test Payee',/g, "imported_payee: 'Imported Test Payee',");
content = content.replace(/categoryName: null,/g, "category_name: null,");
content = content.replace(/accountId: 'a1',/g, "account: 'a1',");

// Note: Candidate uses camelCase! We only need to fix the transaction ones.
// Reverting candidate ones back to camelCase.
// Let's use a regex that only targets the transaction objects

content = content.replace(/date: '2025-01-15',\n\s+amount: 1500,\n\s+payee_name: 'Test Payee',\n\s+account: 'a1',\n\s+account_name: 'Test Account',\n\s+imported_payee: 'Imported Test Payee',\n\s+notes: 'Test Note',\n\s+transferId: null,\n\s+isParent: false,\n\s+isChild: false,\n\s+category_name: null,\n\s+category: null,/g, `date: '2025-01-15',
            amount: 1500,
            payee: 'p1',
            payee_name: 'Test Payee',
            account: 'a1',
            account_name: 'Test Account',
            imported_payee: 'Imported Test Payee',
            notes: 'Test Note',
            transfer_id: null,
            is_parent: false,
            is_child: false,
            category_name: null,
            category: null,`);


// 10. Fix line 111: 'hidden' does not exist in type 'Category'. It should be 'is_hidden'.
content = content.replace(
  "{ id: 'c1', name: 'Test Category', is_income: false, hidden: false, group_id: 'g1' },",
  "{ id: 'c1', name: 'Test Category', is_income: false, is_hidden: false, group_id: 'g1' },"
);


// 11. Fix line 156: mockInput missing placeCache. It's actually the mock for loadReconInputs return value, which has type BuildTimelineReconAuditInput.
// Wait, the error is: Type 'TimelinePlaceCacheFile | undefined' is not assignable to type 'TimelinePlaceCacheFile'.
// The return type of `loadReconInputs` is `{ accounts: Account[]; transactions: Transaction[]; categoriesById: Record<string, Category>; supplementalRows: NormalizedSupplementalRow[]; timeline: ParsedTimelineEntries; placeCache: TimelinePlaceCacheFile; categoryOverrides: TimelineCategoryOverridesFile; }`.
content = content.replace(
  /const mockInput = {\n\s+startDate: '2025-01-01',\n\s+endDate: '2025-01-31',\n\s+transactions: \[\],\n\s+accounts: \[\],\n\s+categoriesById: {},\n\s+supplementalRows: \[\],\n\s+timeline: { stays: \[\], activities: \[\] },\n\s+placeCache: { places: {} },\n\s+categoryOverrides: { transactions: {}, merchantNames: {}, placeKeys: {} },\n\s+};/g,
  `const mockInput = {
        accounts: [],
        transactions: [],
        categoriesById: {},
        supplementalRows: [],
        timeline: { stays: [], activities: [] },
        placeCache: { places: {} },
        categoryOverrides: { transactions: {}, merchantNames: {}, placeKeys: {} },
      };`
);


// 12. Fix line 213, 338, 411: matchedPlaceKey to matchedPlace (or remove it if it's supposed to be absent).
// The Candidate type does not have matchedPlaceKey, matchedMerchant, ruleField, ruleValue, blockedReason.
// The actual Candidate type is TimelineReconCandidate.
content = content.replace(/matchedPlaceKey: undefined,\n\s+matchedMerchant: undefined,\n\s+ruleField: undefined,\n\s+ruleValue: undefined,\n\s+blockedReason: undefined,/g, '');


fs.writeFileSync(path, content);
