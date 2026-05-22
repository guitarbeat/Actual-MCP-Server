const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// fix importedPayee -> imported_payee
content = content.replace(/importedPayee: /g, 'imported_payee: ');

// fix TimelineReconCandidate account -> accountId. Wait, we changed accountId -> account earlier. But that was for Transaction! Let's carefully revert it just for Candidates.
// We can find `account:` inside candidates array:
// The error is at line 204, 327, 399.
content = content.replace(/account: 'a1'/g, "accountId: 'a1'");

// fix the MockInput placeCache undefined issue. The `loadReconInputs` mock returns a mocked input. Let's make sure we cast it or provide all fields.
content = content.replace(/mockInput as unknown as BuildTimelineReconAuditInput/, 'mockInput as BuildTimelineReconAuditInput');
// Let's actually provide it in mockInput:
content = content.replace(
  /const mockInput = \{[\s\S]*?timeline: \{ stays: \[\], activities: \[\] \},\n\s+\};/g,
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


// fix Map Map<string, CurrentTransactionSnapshot> error on 351, 424.
// Let's manually replace `applySupportModule.buildCurrentTransactionsMap([mockTx], {})` with `applySupportModule.buildCurrentTransactionsMap([mockTx], new Map())`
content = content.replace(/buildCurrentTransactionsMap\(\[mockTx\],\s*\{\}\)/g, 'buildCurrentTransactionsMap([mockTx], new Map())');


fs.writeFileSync(path, content, 'utf8');
console.log('Fixes applied to ' + path);
