const fs = require('fs');

const p = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/const transactions = \[\n/g, "const transactions: any[] = [\n");
c = c.replace(/\] as unknown as Transaction\[\];/g, "];");

c = c.replace(/const categoriesById = new Map<string, any>\(\) as unknown as Record<string, Category>;/g,
  "const categoriesById = new Map<string, any>();");
c = c.replace(/const categoriesById: any = new Map<string, any>\(\);/g,
  "const categoriesById = new Map<string, any>();");

c = c.replace(/const categoriesById = new Map\(\[\n/g, "const categoriesById: any = new Map([\n");
c = c.replace(/is_income: false,\n        },\n      \],\n    \]\) as unknown as Record<string, Category>;/g,
  "is_income: false,\n        },\n      ],\n    ]);");

c = c.replace(/const paths: any = \{\n      baseDir: '\/tmp',/g, "const paths: any = {\n      baseDir: '/tmp',");

fs.writeFileSync(p, c, 'utf8');
