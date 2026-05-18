const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/account: 'a1',/g, "account: 'a1', accountId: 'a1',");
content = content.replace(/is_income: false, hidden: false, group_id: 'g1'/g, "is_income: false, is_hidden: false, group_id: 'g1'");
content = content.replace(/payeeName: 'Test Payee',/g, "payeeName: 'Test Payee', payee_name: 'Test Payee',");

fs.writeFileSync(path, content);
console.log('Fixed even more issues in timeline-reconciliation internal.test.ts');
