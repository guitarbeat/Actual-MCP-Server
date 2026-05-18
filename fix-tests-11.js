const fs = require('fs');
const path = require('path');

const testFile = path.resolve('mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts');
let content = fs.readFileSync(testFile, 'utf8');

// I'm changing reconciliationStrategy to 'exact' back and see if I commented out something I shouldn't have.
// Let's print the actual code around applySupportModule.buildCurrentTransactionMap in internal.test.ts
const lines = content.split('\n');

for (let i = 200; i < 230; i++) {
    // If the candidate had reconciliationStrategy: 'exact', put it back
    if (lines[i].includes('// reconciliationStrategy:')) {
        lines[i] = lines[i].replace('// reconciliationStrategy:', 'reconciliationStrategy:');
    }
}
for (let i = 300; i < 350; i++) {
    if (lines[i].includes('// reconciliationStrategy:')) {
        lines[i] = lines[i].replace('// reconciliationStrategy:', 'reconciliationStrategy:');
    }
}
for (let i = 400; i < 450; i++) {
    if (lines[i].includes('// reconciliationStrategy:')) {
        lines[i] = lines[i].replace('// reconciliationStrategy:', 'reconciliationStrategy:');
    }
}

content = lines.join('\n');
fs.writeFileSync(testFile, content);
