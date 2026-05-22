const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// The replacement logic was slightly off for some items due to multiple occurrences or incorrect regex matches.
// Let's use robust replacements.

// 1. Transaction 'category' null to undefined
content = content.replace(/category: null,/g, 'category: undefined,');

// 2. Category 'hidden' vs 'is_hidden' in tests.
// The categories returned by actualClient.getCategories are APICategoryEntity, which use 'hidden'.
// The ones in categoriesById are Category (internal), which also use 'hidden' (wait, let's use hidden for both or whatever TS complains about).
content = content.replace(/is_hidden: false,/g, 'hidden: false,');

// 3. Candidate account property should be accountId, accountName, importedPayee.
// Revert the earlier overly aggressive replacement that affected Candidate.
content = content.replace(/account: 'a1',/g, "accountId: 'a1',");
content = content.replace(/account_name: 'Test Account',/g, "accountName: 'Test Account',");
content = content.replace(/imported_payee: 'Imported Test Payee',/g, "importedPayee: 'Imported Test Payee',");
content = content.replace(/payee_name: 'Test Payee',/g, "payeeName: 'Test Payee',");

// 4. Now fix ONLY the transaction mock in buildCurrentTransactionMap and the input array.
content = content.replace(
  /const mockCurrentTransaction = {\n\s+id: 't1',\n\s+date: '2025-01-15',\n\s+amount: 1500,\n\s+payee: 'p1',\n\s+payeeName: 'Test Payee',\n\s+accountId: 'a1',\n\s+accountName: 'Test Account',\n\s+importedPayee: 'Imported Test Payee',\n\s+notes: 'Test Note',\n\s+transfer_id: null,\n\s+is_parent: false,\n\s+is_child: false,\n\s+category_name: null,\n\s+category: undefined,\n\s+};/g,
  `const mockCurrentTransaction = {
        id: 't1',
        date: '2025-01-15',
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
        category: undefined,
      };`
);

content = content.replace(
  /transactions: \[\n\s+{\n\s+id: 't1',\n\s+date: '2025-01-15',\n\s+amount: 1500,\n\s+payee: 'p1',\n\s+payeeName: 'Test Payee',\n\s+accountId: 'a1',\n\s+accountName: 'Test Account',\n\s+importedPayee: 'Imported Test Payee',\n\s+notes: 'Test Note',\n\s+transfer_id: null,\n\s+is_parent: false,\n\s+is_child: false,\n\s+category_name: null,\n\s+category: undefined,\n\s+},\n\s+\],/g,
  `transactions: [
          {
            id: 't1',
            date: '2025-01-15',
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
            category: undefined,
          },
        ],`
);


// 5. mockInput in generateTimelineReconAudit should NOT be typed `as unknown as BuildTimelineReconAuditInput` if it doesn't match the signature.
// Let's just fix the mock object. It needs to match what loadReconInputs returns, which might be slightly different.
// Actually, `loadReconInputs` returns a promise resolving to an object with `accounts`, `transactions`, `categoriesById`, `supplementalRows`, `timeline`, `placeCache`, `categoryOverrides`.
content = content.replace(
  /const mockInput = {\n\s+accounts: \[\],\n\s+transactions: \[\],\n\s+categoriesById: {},\n\s+supplementalRows: \[\],\n\s+timeline: { stays: \[\], activities: \[\] },\n\s+placeCache: { places: {} },\n\s+categoryOverrides: { transactions: {}, merchantNames: {}, placeKeys: {} },\n\s+};/g,
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
content = content.replace(/mockInput as unknown as BuildTimelineReconAuditInput,/g, 'mockInput as any,');

fs.writeFileSync(path, content);
