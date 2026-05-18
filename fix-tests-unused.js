const fs = require('fs');
const path = require('path');

const timelineTestPath = path.join(__dirname, 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts');
if (fs.existsSync(timelineTestPath)) {
  let lines = fs.readFileSync(timelineTestPath, 'utf8').split('\n');

  // Lines to remove: 73, 98, 229, 253, 358, 364, 436, 443
  const linesToRemove = [73, 98, 229, 253, 358, 364, 436, 443];
  linesToRemove.sort((a, b) => b - a);

  for (const lineNum of linesToRemove) {
    if (lineNum <= lines.length) {
      lines.splice(lineNum - 1, 1);
    }
  }

  fs.writeFileSync(timelineTestPath, lines.join('\n'), 'utf8');
}
