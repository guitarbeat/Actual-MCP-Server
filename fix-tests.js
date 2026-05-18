const fs = require('fs');

const path2 = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let code2 = fs.readFileSync(path2, 'utf8');

code2 = code2.replace(/const mockCurrentTransaction = \{[\s\S]*?\};/g, 'const mockCurrentTransaction: any = {\n        id: \'t1\',\n        date: \'2025-01-15\',\n        amountCents: 1500,\n        payeeName: \'Test Payee\',\n        account: \'a1\',\n        accountName: \'Test Account\',\n        importedPayee: \'Imported Test Payee\',\n        notes: \'Test Note\',\n        transferId: null,\n        isParent: false,\n        isChild: false,\n        categoryName: null,\n        category: null,\n      };');

fs.writeFileSync(path2, code2);
