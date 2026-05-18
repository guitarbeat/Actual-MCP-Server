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
content = content.replace(/is_hidden: false/g, "hidden: false");

content = content.replace(/const mockAudit: TimelineReconAuditFile/g, "const mockAudit: any");

fs.writeFileSync(path, content);
console.log('Fixed type issues with any casts in timeline-reconciliation internal.test.ts');
