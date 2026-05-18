const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'mcp-server/src/core/analysis/historical-transfer-utils.test.ts');
let content = fs.readFileSync(filePath, 'utf8');

// The regex I used earlier added a comma where it shouldn't have when I replaced the string.
content = content.replace(/'Bill-payment labels often represent card payments or account transfers, but no strict unique inverse match was found.',\n      ,/g,
  "'Bill-payment labels often represent card payments or account transfers, but no strict unique inverse match was found.',");
content = content.replace(/,\n      ,/g, ','); // just in case

fs.writeFileSync(filePath, content, 'utf8');
