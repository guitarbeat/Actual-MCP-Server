const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// I missed fixing `account` -> `accountId` for TimelineReconCandidate. It is in the candidates array in `applyTimelineReconAudit` mock.
content = content.replace(/account: 'a1',/g, "accountId: 'a1',");
// I need to undo the one inside `transactions` array, if any.
content = content.replace(/accountId: 'a1',\n\s*account_name: 'Test Account',/g, "account: 'a1',\n            account_name: 'Test Account',");

// I also missed `placeCache` fix for generateTimelineReconAudit. `vi.mocked(ioModule.loadReconInputs).mockResolvedValue(mockInput as unknown as BuildTimelineReconAuditInput);`
content = content.replace(/mockInput as unknown as BuildTimelineReconAuditInput/g, "mockInput as any");

// The `Map` issue: `buildCurrentTransactionsMap([mockTx], {})`
content = content.replace(/buildCurrentTransactionsMap\(\[mockTx\], \{\}\)/g, "buildCurrentTransactionsMap([mockTx], new Map())");

// The `version` issue on line 114, 115. Let's just remove `version` and `generatedAt` if they shouldn't be there, or use `as any` correctly. Actually, let's remove them:
content = content.replace(/placeCache: \{ version: 1, generatedAt: '', places: \{\} \},/g, "placeCache: { places: {} } as any,");
content = content.replace(/categoryOverrides: \{ version: 1, generatedAt: '', transactions: \{\}, merchantNames: \{\}, placeKeys: \{\} \}/g, "categoryOverrides: { transactions: {}, merchantNames: {}, placeKeys: {} } as any");

fs.writeFileSync(path, content, 'utf8');
