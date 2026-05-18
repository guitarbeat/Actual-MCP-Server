const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/payeeName:/g, "payee_name:");
content = content.replace(/is_income: false, hidden: false, group_id: 'g1'/g, "is_income: false, is_hidden: false, group_id: 'g1'");
content = content.replace(/matchedPlaceKey: null,/g, "");

fs.writeFileSync(path, content);
console.log('Fixed more issues in timeline-reconciliation internal.test.ts');
