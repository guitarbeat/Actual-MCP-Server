const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// The `account_name` in candidates needs to be reverted to `accountName`
// Also let's fix accountId in Transaction
content = content.replace(/accountId: 'a1',/g, "account: 'a1',");
// but ONLY inside the transactions array. The transactions array is around line 99.
content = content.replace(
  `amount: 1500,
            payee_name: 'Test Payee',
            accountId: 'a1',
            account_name: 'Test Account',`,
  `amount: 1500,
            payee_name: 'Test Payee',
            account: 'a1',
            account_name: 'Test Account',`
);

content = content.replace(/account_name: 'Test Account',/g, "accountName: 'Test Account',");
// Wait, the transaction itself needs `account_name` but candidates need `accountName`. Let's just fix it for candidates manually by line numbers or patterns.
// In candidates array:
// transactionAmountCents: 1500, ... account_name: 'Test Account',
content = content.replace(/transactionAmountCents: 1500,\n\s*payeeName: 'Test Payee',\n\s*accountId: 'a1',\n\s*account_name: 'Test Account',/g,
                          `transactionAmountCents: 1500,
            payeeName: 'Test Payee',
            accountId: 'a1',
            accountName: 'Test Account',`);

// In the mockTx for applySupportModule (around line 351, 424):
content = content.replace(/const mockTx = \{\s*id: 't1',\s*amount: 1500,\s*payee_name: 'Test Payee',\s*accountId: 'a1',\s*account_name: 'Test Account',/g,
  `const mockTx = {
            id: 't1',
            amount: 1500,
            payee_name: 'Test Payee',
            account: 'a1',
            account_name: 'Test Account',`);

// fix the MockInput placeCache undefined issue. The loadReconInputs return type probably forces `placeCache` to be optional? Or we just cast it better.
content = content.replace(/mockInput as BuildTimelineReconAuditInput/g, '(mockInput as unknown) as BuildTimelineReconAuditInput');


fs.writeFileSync(path, content, 'utf8');
console.log('Fixes applied to ' + path);
