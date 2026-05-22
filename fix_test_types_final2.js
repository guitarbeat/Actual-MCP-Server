const fs = require('fs');
const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// The candidates are at:
// line 201+ for `applyTimelineReconAudit` (exact mock)
// We need them to stay camelCase.
content = content.replace(/amount: 1500,\n\s*payee_name: 'Test Payee',\n\s*account: 'a1',\n\s*account_name: 'Test Account',\n\s*imported_payee: 'Imported Test Payee',\n\s*notes: 'Test Note',\n\s*transfer_id: null,\n\s*is_parent: false,\n\s*is_child: false,/g,
`transactionAmountCents: 1500,
          payeeName: 'Test Payee',
          accountId: 'a1',
          accountName: 'Test Account',
          importedPayee: 'Imported Test Payee',
          notes: 'Test Note',
          transferId: null,
          isParent: false,
          isChild: false,`);

// We also need to fix `TimelineReconPaths` error on lines 140, 174, 248, 274, 279, 295, 349, 366, 421.
// They are missing repoRoot, reconDir, timelinePath, candidatesPath, manualReviewPath
const oldPaths = `{
        baseDir: '/test',
        auditPath: '/test/audit.json',
        supplementalCsvPath: '',
        placeCachePath: '',
        categoryOverridesPath: '',
        manualReviewCsvPath: '',
        candidatesCsvPath: '',
        locationHistoryPath: '',
      }`;

const newPaths = `{
        repoRoot: '/test',
        reconDir: '/test/recon',
        auditPath: '/test/recon/audit.json',
        supplementalCsvPath: '/test/recon/supplemental.csv',
        placeCachePath: '/test/recon/placeCache.json',
        categoryOverridesPath: '/test/recon/categoryOverrides.json',
        manualReviewPath: '/test/recon/manualReview.csv',
        candidatesPath: '/test/recon/candidates.csv',
        timelinePath: '/test/recon/timeline.json',
      }`;

content = content.replace(new RegExp(oldPaths.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newPaths);
// The other paths might not exactly match the multiline string.
content = content.replace(/baseDir: '\/test',/g, "repoRoot: '/test', reconDir: '/test', timelinePath: '/test/timeline.json', candidatesPath: '/test/candidates.csv', manualReviewPath: '/test/manual.csv',");
// we can just cast paths as TimelineReconPaths:
content = content.replace(/const paths = \{/g, 'const paths = {');
content = content.replace(/vi.mocked\(pathsModule.resolveTimelineReconPaths\)\.mockReturnValue\(paths\);/g, 'vi.mocked(pathsModule.resolveTimelineReconPaths).mockReturnValue(paths as any);');
content = content.replace(/ioModule\.loadReconInputs\)\.toHaveBeenCalledWith\(paths\);/g, 'ioModule.loadReconInputs).toHaveBeenCalledWith(paths as any);');
content = content.replace(/ioModule\.writeAuditOutputs\)\.toHaveBeenCalledWith\(expect\.anything\(\), paths\);/g, 'ioModule.writeAuditOutputs).toHaveBeenCalledWith(expect.anything(), paths as any);');


// Error on 150: generateTimelineReconAudit missing placeCache etc.
content = content.replace(/const mockInput = \{/g, 'const mockInput: any = {');

// Error on 207: Type 'null' is not assignable to type '"payee" | "imported_payee" | undefined'.
content = content.replace(/matchField: null/g, "matchField: undefined");
content = content.replace(/matchValue: null/g, "matchValue: undefined");

// Error on 220, 341, 412: TransactionFetchResult missing successfulAccountIds, warnings
content = content.replace(/transactions: \[\],\n\s+\}\);/g, "transactions: [], successfulAccountIds: [], warnings: [] });");

// Error on 243, 345, 417: 'is_hidden' does not exist in type 'APICategoryEntity'. Did you mean to write 'hidden'?
content = content.replace(/is_hidden: /g, "hidden: ");

// Let's replace payee: null -> payee: undefined
content = content.replace(/payee: null/g, "payee: undefined");
content = content.replace(/imported_payee: null/g, "imported_payee: undefined");

fs.writeFileSync(path, content, 'utf8');
