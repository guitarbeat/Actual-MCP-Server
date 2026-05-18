const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/accountId:/g, "account:");
content = content.replace(/is_income: false, is_hidden: false, group_id: 'g1'/g, "is_income: false, hidden: false, group_id: 'g1'");
content = content.replace(/payee_name: 'Test Payee',/g, "payeeName: 'Test Payee',");
content = content.replace(/is_hidden: false/g, "hidden: false");

fs.writeFileSync(path, content);
console.log('Fixed even more issues in timeline-reconciliation internal.test.ts');
