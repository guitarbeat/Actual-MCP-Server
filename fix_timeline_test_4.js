const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// fix TS2322: Type 'null' is not assignable to type 'string | undefined'
content = content.replace(/category_name: null,/g, 'category_name: undefined,');

// fix TS2353: 'hidden' does not exist in type 'Category'
content = content.replace(/hidden: false,/g, 'is_hidden: false,');

// fix TS2353: 'reconciliationStrategy' does not exist in type 'TimelineReconCandidate'
content = content.replace(/reconciliationStrategy: 'exact',/g, '');

// Also let's double check if there are other category hidden properties that should be is_hidden
// APICategoryEntity expects hidden, internal Category expects is_hidden?
// The mocked actualClient.getCategories() returns APICategoryEntity (so hidden),
// but categoriesById uses internal Category (so is_hidden).
// Let's replace the one in categoriesById (line 112) back to is_hidden.
content = content.replace(
  "categoriesById: { c1: { id: 'c1', name: 'Test Category', is_income: false, is_hidden: false, group_id: 'g1' } },",
  "categoriesById: { c1: { id: 'c1', name: 'Test Category', is_income: false, is_hidden: false, group_id: 'g1' } } as any,"
);

fs.writeFileSync(path, content);
