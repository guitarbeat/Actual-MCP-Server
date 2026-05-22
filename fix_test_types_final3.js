const fs = require('fs');
const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// The candidates are at:
// line 201+ for `applyTimelineReconAudit` (exact mock)
// We need them to stay camelCase.
content = content.replace(/account: 'a1',/g, "accountId: 'a1',"); // THIS fixes line 204, 327, 399
// Wait, we need the Transaction mock at line 100 to have `account` NOT `accountId`. Let's fix that one back explicitly.
content = content.replace(/accountId: 'a1',\n\s*account_name: 'Test Account',/g, "account: 'a1',\n            account_name: 'Test Account',");

// Error on line 106: categoryName in Transaction should be category_name
content = content.replace(/categoryName: null,/g, "category_name: undefined,"); // null is not assignable? Transaction might be nullable. Let's just do category_name: null
content = content.replace(/category_name: null,/g, "category_name: undefined,");
content = content.replace(/category: null,/g, "category: undefined,");
content = content.replace(/transfer_id: null,/g, "transfer_id: undefined,");

// Error on 155: generateTimelineReconAudit missing placeCache
content = content.replace(/const mockInput: any = \{/g, 'const mockInput = {');
// we already added `as any` below, let's just make sure loadReconInputs takes `mockInput as any`
content = content.replace(/vi.mocked\(ioModule.loadReconInputs\).mockResolvedValue\(\n\s+mockInput as unknown as BuildTimelineReconAuditInput,\n\s+\);/g, "vi.mocked(ioModule.loadReconInputs).mockResolvedValue(mockInput as any);");


// Error on 351, 424: Map {} issue
// applySupportModule.buildCurrentTransactionsMap([mockTx], {})
content = content.replace(/buildCurrentTransactionsMap\(\[mockTx\], \{\}\)/g, "buildCurrentTransactionsMap([mockTx], new Map())");


fs.writeFileSync(path, content, 'utf8');
