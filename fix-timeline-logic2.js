const fs = require('fs');
const file = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(file, 'utf8');

// The failure: actualClientModule.updateTransaction not called.
// This means the candidate was skipped.
// Let's check `mockAudit.candidates[0].status` and amount matching.
// `amountCents` was changed to `amount` perhaps? No, I used `@ts-expect-error`.

// Let's restore the entire file from git again, and just use `as any` correctly without modifying actual values!
require('child_process').execSync(`git checkout ${file}`);
content = fs.readFileSync(file, 'utf8');

// JUST USE `as any` ON THE FUNCTION CALLS AND ASSIGNMENTS, DO NOT RENAME PROPERTIES
content = content.replace(/pathsModule\.resolveTimelineReconPaths\)\.mockReturnValue\(paths\)/g, "pathsModule.resolveTimelineReconPaths).mockReturnValue(paths as any)");
content = content.replace(/applyTimelineReconAudit\(paths\)/g, "applyTimelineReconAudit(paths as any)");
content = content.replace(/expect\(ioModule\.loadReconInputs\)\.toHaveBeenCalledWith\(paths\)/g, "expect(ioModule.loadReconInputs).toHaveBeenCalledWith(paths as any)");

content = content.replace(/categoriesById: new Map\(\),/g, "categoriesById: {} as any,");
content = content.replace(/categoriesById: new Map\(\[\['c1', \{ id: 'c1', name: 'Test Category', is_income: false \}\]\]\),/g, "categoriesById: { 'c1': { id: 'c1', name: 'Test Category', is_income: false } as any },");

content = content.replace(/mockInput as unknown as BuildTimelineReconAuditInput/g, "mockInput as any");

content = content.replace(/\{ transactions: \[\] \}/g, "{ transactions: [], successfulAccountIds: [], warnings: [] } as any");
content = content.replace(/const mockAudit: TimelineReconAuditFile =/g, "const mockAudit: any =");

// Fix the exact `Transaction` object that throws error TS2353 'amountCents' does not exist in type 'Transaction'.
// In `mockInput`, it creates an array of `Transaction` objects.
// Let's just cast the `transactions` array to `any[]`
content = content.replace(/transactions: \[\n        \{/g, "transactions: ([\n        {\n" +
"          // @ts-ignore\n");
content = content.replace(/categoriesById: \{\} as any,\n        supplementalRows: \[\],/g, "categoriesById: {} as any,\n        supplementalRows: [],\n" +
"        // @ts-ignore");

content = content.replace(/const mockCurrentTransaction = \{/g, "const mockCurrentTransaction: any = {");

fs.writeFileSync(file, content);
