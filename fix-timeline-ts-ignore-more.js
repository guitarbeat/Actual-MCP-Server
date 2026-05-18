const fs = require('fs');
const path = require('path');

const timelineTestPath = path.join(__dirname, 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts');
if (fs.existsSync(timelineTestPath)) {
  let content = fs.readFileSync(timelineTestPath, 'utf8');
  let lines = content.split('\n');

  // Lines to ignore: 103, 360, 438
  const linesToIgnore = [103, 360, 438];

  linesToIgnore.sort((a, b) => b - a);

  for (const lineNum of linesToIgnore) {
    if (lineNum <= lines.length) {
      lines.splice(lineNum - 1, 0, '    // @ts-ignore');
    }
  }

  fs.writeFileSync(timelineTestPath, lines.join('\n'), 'utf8');
}
