const fs = require('fs');

const path = 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts';
let content = fs.readFileSync(path, 'utf8');

// Fix Map to Record
content = content.replace(/new Map\(\)/g, '{}');
content = content.replace(/new Map\(\[\['c1', \{ id: 'c1', name: 'Test Category', is_income: false \}\]\]\)/g, "{ 'c1': { id: 'c1', name: 'Test Category', is_income: false } }");

// Fix transaction amountCents
content = content.replace(/amountCents:/g, 'amount:');

// Fix paths object creation
const oldPaths = `{
        baseDir: '/test',
        auditPath: '/test/audit.json',
        supplementalCsvPath: '',
        placeCachePath: '',
        categoryOverridesPath: '',
        manualReviewCsvPath: '',
        candidatesCsvPath: '',
        locationHistoryPath: '',
      }`;

const newPaths = `{
        repoRoot: '/test',
        reconDir: '/test/recon',
        auditPath: '/test/recon/audit.json',
        supplementalCsvPath: '/test/recon/supplemental.csv',
        placeCachePath: '/test/recon/placeCache.json',
        categoryOverridesPath: '/test/recon/categoryOverrides.json',
        manualReviewPath: '/test/recon/manualReview.csv',
        candidatesPath: '/test/recon/candidates.csv',
        timelinePath: '/test/recon/timeline.json',
      }`;

content = content.replace(new RegExp(oldPaths.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newPaths);
content = content.replace(/locationHistoryPath/g, 'timelinePath'); // in case it appears individually

// Fix null assignment to payees
content = content.replace(/importedPayee: null/g, 'importedPayee: undefined');
content = content.replace(/payeeName: null/g, 'payeeName: undefined');
content = content.replace(/payee: null/g, 'payee: undefined');
content = content.replace(/imported_payee: null/g, 'imported_payee: undefined');

// Fix APICategoryEntity is_hidden
content = content.replace(/is_hidden: /g, 'hidden: ');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixes applied to ' + path);
