const fs = require('fs');
const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/pathsModule\.resolveTimelineReconPaths\)\.mockReturnValue\(paths\)/g, "pathsModule.resolveTimelineReconPaths).mockReturnValue(paths as any)");
content = content.replace(/applyTimelineReconAudit\(paths\)/g, "applyTimelineReconAudit(paths as any)");
content = content.replace(/expect\(ioModule\.loadReconInputs\)\.toHaveBeenCalledWith\(paths\)/g, "expect(ioModule.loadReconInputs).toHaveBeenCalledWith(paths as any)");

content = content.replace(/categoriesById: new Map\(\),/g, "categoriesById: {},");
content = content.replace(/categoriesById: new Map\(\[\['c1', \{ id: 'c1', name: 'Test Category', is_income: false \}\]\]\),/g, "categoriesById: { 'c1': { id: 'c1', name: 'Test Category', is_income: false, hidden: false, group_id: 'g1' } as any },");

content = content.replace(/amountCents: 1500,/g, "amount: 1500,");
content = content.replace(/payeeName:/g, "payee_name:");
content = content.replace(/accountId:/g, "account:");

content = content.replace(/\{ transactions: \[\] \}/g, "{ transactions: [], successfulAccountIds: [], warnings: [] }");
content = content.replace(/is_hidden: false/g, "hidden: false");

content = content.replace(/ruleField: null,/g, "ruleField: undefined,");
content = content.replace(/ruleValue: null,/g, "ruleValue: undefined,");
content = content.replace(/matchedPlaceKey: null,/g, "matchedPlaceKey: undefined,");

content = content.replace(/mockInput as unknown as BuildTimelineReconAuditInput/g, "mockInput as any");

// Need to fix candidate structure mismatches.
content = content.replace(/candidates: \[([\s\S]*?)\]/g, "candidates: [$1] as any[]");

fs.writeFileSync(path, content);
console.log('Fixed type issues with generic cast fallback in timeline-reconciliation internal.test.ts');
