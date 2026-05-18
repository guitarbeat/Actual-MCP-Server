const fs = require('fs');

let testContent = fs.readFileSync('mcp-server/src/tools/budgets/get-budget/index.test.ts', 'utf8');
testContent = testContent.replace('function parseJsonResponse(response: unknown): Record<string, unknown> {', 'function parseJsonResponse(response: any): Record<string, unknown> {');
fs.writeFileSync('mcp-server/src/tools/budgets/get-budget/index.test.ts', testContent);
