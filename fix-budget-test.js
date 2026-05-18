const fs = require('fs');
const path = require('path');

const getBudgetPath = path.join(__dirname, 'mcp-server/src/tools/budgets/get-budget/index.test.ts');
let budgetContent = fs.readFileSync(getBudgetPath, 'utf8');
budgetContent = budgetContent.replace(/vi.mocked\(\(client\.getBudgetMonth as any\)\)/g,
  "vi.mocked(client.getBudgetMonth as unknown as () => unknown)");
fs.writeFileSync(getBudgetPath, budgetContent, 'utf8');

const typesPath = path.join(__dirname, 'mcp-server/src/core/api/actual-client/types.ts');
let typesContent = fs.readFileSync(typesPath, 'utf8');
typesContent = typesContent.replace(/all\?: \(sql: string, params: unknown\[\]\) => Promise<any\[\]>;/g,
  "all?: (sql: string, params: unknown[]) => Promise<unknown[]>;");
fs.writeFileSync(typesPath, typesContent, 'utf8');
