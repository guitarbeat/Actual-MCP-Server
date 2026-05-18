const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix TimelineReconPaths usage - cast 'paths' to any or the correct type where it's used
content = content.replace(/pathsModule\.resolveTimelineReconPaths\)\.mockReturnValue\(paths\)/g, "pathsModule.resolveTimelineReconPaths).mockReturnValue(paths as any)");
content = content.replace(/applyTimelineReconAudit\(paths\)/g, "applyTimelineReconAudit(paths as any)");
content = content.replace(/expect\(ioModule\.loadReconInputs\)\.toHaveBeenCalledWith\(paths\)/g, "expect(ioModule.loadReconInputs).toHaveBeenCalledWith(paths as any)");

// 2. Fix Record<string, Category> vs Map
content = content.replace(/categoriesById: new Map\(\),/g, "categoriesById: {},");
content = content.replace(/categoriesById: new Map\(\[\['c1', \{ id: 'c1', name: 'Test Category', is_income: false \}\]\]\),/g, "categoriesById: { 'c1': { id: 'c1', name: 'Test Category', is_income: false, hidden: false, group_id: 'g1' } },");

// 3. Fix Transaction amountCents vs amount
content = content.replace(/amountCents: 1500,/g, "amount: 1500,");

// 4. Fix APICategoryEntity hidden vs is_hidden
content = content.replace(/is_hidden: false/g, "hidden: false");

// 5. Fix TransactionFetchResult missing properties
content = content.replace(/\{ transactions: \[\] \}/g, "{ transactions: [], successfulAccountIds: [], warnings: [] }");

// 6. Fix null assignability issues in TimelineReconCandidate
content = content.replace(/ruleField: null,/g, "ruleField: undefined,");
content = content.replace(/ruleValue: null,/g, "ruleValue: undefined,");

// 7. Fix BuildTimelineReconAuditInput missing properties
content = content.replace(/mockInput as unknown as BuildTimelineReconAuditInput/g, "mockInput as any");


fs.writeFileSync(path, content);
console.log('Fixed timeline-reconciliation internal.test.ts');
