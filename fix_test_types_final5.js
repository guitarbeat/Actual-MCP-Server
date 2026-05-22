const fs = require('fs');
const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// I will do it explicitly for lines

// 99 accountId -> account
content = content.replace(/accountId: 'a1',\n\s*accountName: 'Test Account',\n\s*payeeName: 'Test Payee',\n\s*importedPayee: 'Imported Test Payee',/g,
  "account: 'a1',\n            account_name: 'Test Account',\n            payee_name: 'Test Payee',\n            imported_payee: 'Imported Test Payee',");

// 155 placeCache missing
content = content.replace(/placeCache: \{ version: 1, generatedAt: '', places: \{\} \} as any,/g, "placeCache: { version: 1, generatedAt: '', places: {} },");
content = content.replace(/categoryOverrides: \{ version: 1, generatedAt: '', transactions: \{\}, merchantNames: \{\}, placeKeys: \{\} \} as any/g, "categoryOverrides: { version: 1, generatedAt: '', transactions: {}, merchantNames: {}, placeKeys: {} }");
// Wait, we need to enforce `as any` on mockInput because `TimelinePlaceCacheFile` requires specific things. Let's just make it `const mockInput: any = { ... };` globally without any types, and it will be cast via `as unknown as BuildTimelineReconAuditInput`.
content = content.replace(/const mockInput: BuildTimelineReconAuditInput = \{/g, "const mockInput: any = {");
content = content.replace(/const mockInput = \{/g, "const mockInput: any = {");

// 211, 334, 406 matchedPlaceKey
content = content.replace(/matchedPlaceKey:/g, "// matchedPlaceKey:");

// 351, 424 buildCurrentTransactionsMap([mockTx], {})
// It might be formatted differently, maybe `buildCurrentTransactionsMap([mockTx], {` with newlines. Let's find exactly how it is written.
let idx1 = content.indexOf('buildCurrentTransactionsMap');
while(idx1 !== -1) {
    let nextBrace = content.indexOf('{}', idx1);
    if(nextBrace !== -1 && nextBrace - idx1 < 100) {
        content = content.substring(0, nextBrace) + "new Map()" + content.substring(nextBrace + 2);
    }
    idx1 = content.indexOf('buildCurrentTransactionsMap', idx1 + 1);
}


fs.writeFileSync(path, content, 'utf8');
