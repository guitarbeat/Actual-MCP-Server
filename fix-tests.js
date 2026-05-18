const fs = require('fs');

const p = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let c = fs.readFileSync(p, 'utf8');

// remove @ts-nocheck
c = c.replace(/\/\/ @ts-nocheck\n/g, "");
// Add eslint-disable
c = "/* eslint-disable @typescript-eslint/ban-ts-comment */\n" + c;

fs.writeFileSync(p, c, 'utf8');
