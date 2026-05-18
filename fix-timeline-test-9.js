const fs = require('fs');
const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';

let content = fs.readFileSync(path, 'utf8');

content = content.replace(/pathsModule\.resolveTimelineReconPaths\)\.mockReturnValue\(paths\)/g, "pathsModule.resolveTimelineReconPaths).mockReturnValue(paths as any)");
content = content.replace(/applyTimelineReconAudit\(paths\)/g, "applyTimelineReconAudit(paths as any)");
content = content.replace(/expect\(ioModule\.loadReconInputs\)\.toHaveBeenCalledWith\(paths\)/g, "expect(ioModule.loadReconInputs).toHaveBeenCalledWith(paths as any)");

content = content.replace(/categoriesById: new Map\(\),/g, "categoriesById: {} as any,");
content = content.replace(/categoriesById: new Map\(\[\['c1', \{ id: 'c1', name: 'Test Category', is_income: false \}\]\]\),/g, "categoriesById: { 'c1': { id: 'c1', name: 'Test Category', is_income: false } as any },");

content = content.replace(/amountCents: 1500,/g, "amount: 1500,");
content = content.replace(/mockInput as unknown as BuildTimelineReconAuditInput/g, "mockInput as any");
content = content.replace(/\{ transactions: \[\] \}/g, "{ transactions: [], successfulAccountIds: [], warnings: [] } as any");

content = content.replace(/const mockAudit: TimelineReconAuditFile/g, "const mockAudit: any");
content = content.replace(/is_hidden: false/g, "hidden: false");

// Ensure Transaction and Category objects are safely casted when passed inside other objects
content = content.replace(/transactions: \[/g, "transactions: [");
content = content.replace(/accounts: \[\]/g, "accounts: [] as any[]");
content = content.replace(/transactions: \[\]/g, "transactions: [] as any[]");

// Fix the exact error:
// src/core/analysis/timeline-reconciliation/internal.test.ts(97,13): error TS2353: Object literal may only specify known properties, and 'amountCents' does not exist in type 'Transaction'.

// Wait, the previous sed ran locally but we overwrote with git checkout. Let's do it cleanly via sed instead to avoid any duplicate keys from regex
