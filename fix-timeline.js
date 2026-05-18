const fs = require('fs');
const file = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(file, 'utf8');

// The reason it skips is because `amount` in `currentTx` needs to match `transactionAmountCents` in the candidate.
// My previous script might have added `amount: 1500` but removed `amountCents: 1500`.
// Let's replace the ENTIRE `mockCurrentTransaction` declaration with what we KNOW works!

content = content.replace(/const mockCurrentTransaction: any = \{([\s\S]*?)category: null,\n      \} as any;/g,
"const mockCurrentTransaction: any = {\n" +
"        id: 't1',\n" +
"        date: '2025-01-15',\n" +
"        amount: 1500,\n" +
"        amountCents: 1500,\n" +
"        payee_name: 'Test Payee',\n" +
"        account: 'a1',\n" +
"        account_name: 'Test Account',\n" +
"        imported_payee: 'Imported Test Payee',\n" +
"        notes: 'Test Note',\n" +
"        transfer_id: null,\n" +
"        is_parent: false,\n" +
"        is_child: false,\n" +
"        category_name: null,\n" +
"        category: null,\n" +
"      } as any;");

// Also check `mockAudit` candidates to ensure `transactionAmountCents` is correct
content = content.replace(/transactionAmountCents: 1500,/g, "transactionAmountCents: 1500,\n            amount: 1500,");


fs.writeFileSync(file, content);
