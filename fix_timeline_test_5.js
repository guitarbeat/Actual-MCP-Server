const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// fix TS2741: Property 'confidenceTier' is missing
content = content.replace(/status: 'ready-exact',/g, "status: 'ready-exact',\n            confidenceTier: 'tier1-exact',");
content = content.replace(/status: 'manual',/g, "status: 'manual',\n            confidenceTier: 'tier4-manual',");

// fix TS2561: 'is_hidden' does not exist in type 'APICategoryEntity' (lines 246, 348, 418)
// This is inside the mock for getCategories
content = content.replace(/is_hidden: false, group_id: 'g1'/g, "hidden: false, group_id: 'g1'");

fs.writeFileSync(path, content);
