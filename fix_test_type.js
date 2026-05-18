const fs = require('fs');

let testContent = fs.readFileSync('mcp-server/src/tools/budgets/get-budget/index.test.ts', 'utf8');
testContent = testContent.replace('function parseJsonResponse(response: any): Record<string, unknown> {', 'function parseJsonResponse(response: unknown): Record<string, unknown> {');
testContent = testContent.replace('return typeof response === \'string\' ? JSON.parse(response) : response;', 'return typeof response === \'string\' ? JSON.parse(response) : (response as Record<string, unknown>);');
fs.writeFileSync('mcp-server/src/tools/budgets/get-budget/index.test.ts', testContent);
