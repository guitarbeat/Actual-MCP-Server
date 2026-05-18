const fs = require('fs');

const p = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let c = fs.readFileSync(p, 'utf8');

// The lint/type errors were because of `@ts-ignore` instead of `@ts-expect-error` and some explicit typing issues.
// Let's replace EVERY `@ts-ignore` with `@ts-expect-error type mocking`.
c = c.replace(/@ts-ignore/g, '@ts-expect-error type mocking');

// Wait! Some `@ts-expect-error`s were failing with "Unused @ts-expect-error directive"
// Those were at lines: 73, 98, 229, 253, 358, 364, 436, 443
// I need to REMOVE them or replace them with nothing.
const lines = c.split('\n');

const linesToRemove = [73, 98, 229, 253, 358, 364, 436, 443];
linesToRemove.sort((a, b) => b - a);

for (const lineNum of linesToRemove) {
  if (lineNum <= lines.length) {
    if (lines[lineNum - 1].includes('@ts-expect-error type mocking') || lines[lineNum - 1].includes('@ts-ignore')) {
       lines.splice(lineNum - 1, 1);
    }
  }
}

// Ensure the formatting matches Prettier exactly where it complained.
// Prettier complained about lines 144, 114, 103, 98, etc. because of missing spaces before `// @ts-expect-error`.
// Actually, it complained about replacing `/Invalid historical transfer candidate ID/` earlier, which I fixed.
// The new errors:
//  73:5   error    Insert `····`
//  103:5   error    Insert `········`
//  114:1   error    Insert `····`
//  144:5   error    Insert `··`
//  155:1   error    Insert `····`
//  180:1   error    Replace `····` with `······`
// Let's just run Prettier to fix those automatically!

fs.writeFileSync(p, lines.join('\n'), 'utf8');
