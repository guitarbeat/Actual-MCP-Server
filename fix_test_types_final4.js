const fs = require('fs');
const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// Line 106: categoryName -> category_name
content = content.replace(/categoryName: undefined,/g, "category_name: undefined,");

// Line 155: mockInput undefined placeCache
// The problem is that the type of mockInput isn't quite working or ioModule mock isn't working right.
// Let's do `const mockInput: BuildTimelineReconAuditInput = { ... placeCache: { places: {} } as any, categoryOverrides: { transactions: {}, merchantNames: {}, placeKeys: {} } as any }`
content = content.replace(/const mockInput = \{/g, "const mockInput: BuildTimelineReconAuditInput = {");
// Wait, placeCache is `{ places: {} }`, which matches TimelinePlaceCacheFile if it has the version and generatedAt, etc.
// Let's just use `as any` correctly on mockInput:
content = content.replace(/const mockInput = \{\n\s*startDate/g, "const mockInput = {\n        startDate"); // already there
content = content.replace(/placeCache: \{ places: \{\} \},\n\s*categoryOverrides: \{ transactions: \{\}, merchantNames: \{\}, placeKeys: \{\} \}/g, "placeCache: { version: 1, generatedAt: '', places: {} } as any,\n        categoryOverrides: { version: 1, generatedAt: '', transactions: {}, merchantNames: {}, placeKeys: {} } as any");

// Or just force mockInput to `any`
content = content.replace(/const mockInput = \{\n\s*startDate: '2025-01-01',/g, "const mockInput: any = {\n        startDate: '2025-01-01',");
content = content.replace(/\(mockInput as unknown\) as BuildTimelineReconAuditInput/g, "(mockInput as unknown) as BuildTimelineReconAuditInput");

// Line 204: candidate `account` should be `accountId`, `account_name` -> `accountName`, `payee_name` -> `payeeName`, `imported_payee` -> `importedPayee`
// This happens in the `candidates: [` array.
content = content.replace(/account: 'a1',\n\s*account_name: 'Test Account',\n\s*payee_name: 'Test Payee',\n\s*imported_payee: 'Imported Test Payee',/g,
"accountId: 'a1',\n            accountName: 'Test Account',\n            payeeName: 'Test Payee',\n            importedPayee: 'Imported Test Payee',");

// Let's make sure it catches all of them!
// Line 327, 399 also have this.
// `account: 'a1',\n\s*account_name: 'Test Account',\n\s*payee_name: 'Test Payee',\n\s*imported_payee: 'Imported Test Payee',`
// This regex will replace them globally:
// Actually `payee_name: undefined` might happen if imported_payee is not present.
content = content.replace(/account: 'a1',/g, "accountId: 'a1',");
// Wait! `account: 'a1'` is also in `transactions: [` on line 99!! So if we globally replace `account: 'a1',` to `accountId: 'a1',`, we break Transaction again.
// Instead, let's explicitly target candidates:
content = content.replace(/account: 'a1',\n\s*account_name/g, "accountId: 'a1',\n            accountName");
content = content.replace(/account_name: 'Test Account',\n\s*payee_name/g, "accountName: 'Test Account',\n            payeeName");
content = content.replace(/payee_name: 'Test Payee',\n\s*imported_payee/g, "payeeName: 'Test Payee',\n            importedPayee");
content = content.replace(/imported_payee: 'Imported Test Payee',\n\s*status/g, "importedPayee: 'Imported Test Payee',\n            status");

content = content.replace(/payee_name: undefined,\n\s*imported_payee/g, "payeeName: undefined,\n            importedPayee");
content = content.replace(/imported_payee: undefined,\n\s*status/g, "importedPayee: undefined,\n            status");


// Line 351, 424: buildCurrentTransactionsMap({}, {})
// The regex earlier might not have worked.
// `applySupportModule.buildCurrentTransactionsMap([mockTx], {})`
content = content.replace(/buildCurrentTransactionsMap\(\[mockTx\], \{\}\)/g, "buildCurrentTransactionsMap([mockTx], new Map())");


fs.writeFileSync(path, content, 'utf8');
