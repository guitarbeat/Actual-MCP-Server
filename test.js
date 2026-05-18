const fs = require('fs');
const content = fs.readFileSync('mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('buildCurrentTransactionMap')) {
    console.log(i + ': ' + l);
  }
});
