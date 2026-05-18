const fs = require('fs');
const internalCode = fs.readFileSync('mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts', 'utf8');

// Change `expect(result.skippedChangedTransactions).toBe(0);` to console.log result to see what is failing
let code = internalCode.replace('expect(result.exactUpdatesApplied).toBe(1);', 'console.log("RESULT", result); expect(result.exactUpdatesApplied).toBe(1);');

fs.writeFileSync('mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts', code);
