const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/mockInput as unknown as BuildTimelineReconAuditInput/g, "mockInput as any");
content = content.replace(/mockInput as BuildTimelineReconAuditInput/g, "mockInput as any");

// Just replace {} globally for buildCurrentTransactionsMap if it's there
let parts = content.split('buildCurrentTransactionsMap(');
if (parts.length > 1) {
  for (let i = 1; i < parts.length; i++) {
    parts[i] = parts[i].replace('{}', 'new Map() as any');
  }
}
content = parts.join('buildCurrentTransactionsMap(');

fs.writeFileSync(path, content, 'utf8');
