const fs = require('fs');
const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';

// Get clean copy to start fresh
require('child_process').execSync(`git checkout ${path}`);

let content = fs.readFileSync(path, 'utf8');

content = content.replace(/pathsModule\.resolveTimelineReconPaths\)\.mockReturnValue\(paths\)/g, "pathsModule.resolveTimelineReconPaths).mockReturnValue(paths as any)");
content = content.replace(/applyTimelineReconAudit\(paths\)/g, "applyTimelineReconAudit(paths as any)");
content = content.replace(/expect\(ioModule\.loadReconInputs\)\.toHaveBeenCalledWith\(paths\)/g, "expect(ioModule.loadReconInputs).toHaveBeenCalledWith(paths as any)");

content = content.replace(/categoriesById: new Map\(\),/g, "categoriesById: {} as any,");
content = content.replace(/categoriesById: new Map\(\[\['c1', \{ id: 'c1', name: 'Test Category', is_income: false \}\]\]\),/g, "categoriesById: { 'c1': { id: 'c1', name: 'Test Category', is_income: false } as any },");

content = content.replace(/mockInput as unknown as BuildTimelineReconAuditInput/g, "mockInput as any");
content = content.replace(/\{ transactions: \[\] \}/g, "{ transactions: [], successfulAccountIds: [], warnings: [] } as any");

// mockCurrentTransaction cast
content = content.replace(/mockCurrentTransaction as unknown as CurrentTransactionSnapshot/g, "mockCurrentTransaction as any");

// mockAudit candidates cast
content = content.replace(/candidates: \[([\s\S]*?)\]/g, "candidates: [$1] as any[]");

// mockAudit warnings and manual reviews cast
content = content.replace(/manualReviews: \[\]/g, "manualReviews: [] as any[]");
content = content.replace(/warnings: \[\]/g, "warnings: [] as any[]");

fs.writeFileSync(path, content);
console.log('Fixed type issues with any casts in timeline-reconciliation internal.test.ts');
