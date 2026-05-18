const fs = require('fs');

let typesContent = fs.readFileSync('mcp-server/src/core/api/actual-client/types.ts', 'utf8');
typesContent = typesContent.replace('Promise<any[]>', 'Promise<unknown[]>');
fs.writeFileSync('mcp-server/src/core/api/actual-client/types.ts', typesContent);

let testContent = fs.readFileSync('mcp-server/src/tools/budgets/get-budget/index.test.ts', 'utf8');
testContent = testContent.replace('function parseJsonResponse(response: any)', 'function parseJsonResponse(response: unknown)');
fs.writeFileSync('mcp-server/src/tools/budgets/get-budget/index.test.ts', testContent);

let concurTestContent = fs.readFileSync('mcp-server/src/core/utils/concurrency.test.ts', 'utf8');
concurTestContent = concurTestContent.replace('resolve => setTimeout(resolve, 10)', '(resolve) => setTimeout(resolve, 10)');
fs.writeFileSync('mcp-server/src/core/utils/concurrency.test.ts', concurTestContent);
