const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// The `Map` issue
content = content.replace(/buildCurrentTransactionsMap\(\[mockTx\] as any, \{\}\)/g, "buildCurrentTransactionsMap([mockTx] as any, new Map())");
// maybe the previous regex didn't catch all of them because it was `[mockTx]` instead of `[mockTx] as any` or something?
content = content.replace(/buildCurrentTransactionsMap\(\[mockTx\], \{\}\)/g, "buildCurrentTransactionsMap([mockTx] as any, new Map())");
content = content.replace(/buildCurrentTransactionsMap\(\[mockTx as any\], \{\}\)/g, "buildCurrentTransactionsMap([mockTx] as any, new Map())");

// Let's just do a generic replacement for `buildCurrentTransactionsMap`
content = content.replace(/buildCurrentTransactionsMap\(([^,]+),\s*\{\}\)/g, "buildCurrentTransactionsMap($1 as any, new Map())");

// Line 145: generateTimelineReconAudit `mockInput` as BuildTimelineReconAuditInput
// Let's find `mockInput as BuildTimelineReconAuditInput` and change it to `mockInput as any`
content = content.replace(/mockInput as BuildTimelineReconAuditInput/g, "mockInput as any");

fs.writeFileSync(path, content, 'utf8');
