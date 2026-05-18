const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'mcp-server/src/core/analysis/historical-transfer-utils.test.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Undo the broken fix and apply prettier
content = content.replace(/'Bill-payment labels often represent card payments or account transfers, but no strict unique inverse match was found.',/g,
  "'Bill-payment labels often represent card payments or account transfers, but no strict unique inverse match was found.'");

fs.writeFileSync(filePath, content, 'utf8');

const getBudgetPath = path.join(__dirname, 'mcp-server/src/tools/budgets/get-budget/index.test.ts');
let budgetContent = fs.readFileSync(getBudgetPath, 'utf8');
budgetContent = budgetContent.replace(/vi.mocked\(\(client\.getBudgetMonth as unknown\)\)/g,
  "vi.mocked(client.getBudgetMonth as unknown as () => any)");
fs.writeFileSync(getBudgetPath, budgetContent, 'utf8');
