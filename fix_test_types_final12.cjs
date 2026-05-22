const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// The ioModule.loadReconInputs mock needs to return `BuildTimelineReconAuditInput`.
// The problem is the `vi.mocked(ioModule.loadReconInputs).mockResolvedValue((mockInput as unknown) as BuildTimelineReconAuditInput);`
// TS says: Type '{ ... placeCache: any, ... }' is missing the following properties from type 'BuildTimelineReconAuditInput': something something 'placeCache'.
content = content.replace(/\(mockInput as unknown\) as BuildTimelineReconAuditInput/g, "mockInput as any");

// The `Map` issue:
// `vi.mocked(applySupportModule.buildCurrentTransactionMap).mockReturnValue({});`
// It is `buildCurrentTransactionMap` NOT `buildCurrentTransactionsMap`
content = content.replace(/vi.mocked\(applySupportModule.buildCurrentTransactionMap\).mockReturnValue\(\{\}\);/g, "vi.mocked(applySupportModule.buildCurrentTransactionMap).mockReturnValue(new Map() as any);");

fs.writeFileSync(path, content, 'utf8');
