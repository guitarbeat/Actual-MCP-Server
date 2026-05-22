const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'mcp-server/src/core/analysis/timeline-reconciliation/internal.test.ts');
let content = fs.readFileSync(filePath, 'utf8');

// To fix eslint error we shouldn't use @ts-nocheck. We can use // @ts-expect-error - bypassing strict type checks.
// But it's easier to just cast as `unknown` then `any` safely. Let's just fix the types natively to pass TS cleanly.
// Let's restore the original file and fix properly.

content = content.replace(/Map<any, any>/g, 'Record<string, Category>');
content = content.replace(/Map<string, \{ id: string; name: string; is_income: boolean; \}>/g, 'Record<string, Category>');
content = content.replace(/categoriesById: new Map\(\),/g, 'categoriesById: {},');
content = content.replace(/categoriesById: new Map\(\[\n          \[\n            'c1',\n            \{ id: 'c1', name: 'Test Category', is_income: false \},\n          \],\n        \]\),/g, 'categoriesById: { \'c1\': { id: \'c1\', name: \'Test Category\', is_income: false, hidden: false, group_id: \'g1\' } },');

content = content.replace(/amountCents: 1500/g, 'amount: 1500');

content = content.replace(/candidates: \[\n          \{\n            transactionId: 't1',\n            transactionDate: '2025-01-15',\n            amount: 1500,/g, 'candidates: [\n          {\n            transactionId: \'t1\',\n            transactionDate: \'2025-01-15\',\n            transactionAmountCents: 1500,');


// Fix paths definition
content = content.replace(/const paths = \{\n\s*baseDir: '\/test',\n\s*auditPath: '\/test\/audit\.json',\n\s*supplementalCsvPath: '',\n\s*placeCachePath: '',\n\s*categoryOverridesPath: '',\n\s*manualReviewCsvPath: '',\n\s*candidatesCsvPath: '',\n\s*locationHistoryPath: '',\n\s*\};/g, "const paths = {\n        baseDir: '/test',\n        auditPath: '/test/audit.json',\n        supplementalCsvPath: '',\n        placeCachePath: '',\n        categoryOverridesPath: '',\n        manualReviewCsvPath: '',\n        candidatesCsvPath: '',\n        locationHistoryPath: '',\n        repoRoot: '/test',\n        reconDir: '/test/.local-reconciliation',\n        timelinePath: '/test/.local-reconciliation/timeline.json',\n        candidatesPath: '/test/.local-reconciliation/candidates.json',\n        manualReviewPath: '/test/.local-reconciliation/manual-review.csv'\n      };");

// Fix "payee" | "imported_payee" type error
content = content.replace(/ruleField: null,/g, 'ruleField: undefined,');
content = content.replace(/ruleValue: null,/g, 'ruleValue: undefined,');

// Fix candidates fields
content = content.replace(/matchedPlaceKey:/g, 'placeId:');
content = content.replace(/matchedMerchant:/g, 'placeName:');

// Fix transactions: []
content = content.replace(/\{ transactions: \[\] \}/g, '{ transactions: [], successfulAccountIds: [], warnings: [] }');

// Fix is_hidden
content = content.replace(/is_hidden:/g, 'hidden:');

// AccountName -> account_name, importedPayee -> imported_payee, payeeName -> payee_name
// BUT mockCurrentTransaction is a CurrentTransactionSnapshot not a Transaction, wait
content = content.replace(/accountId: 'a1'/g, 'account: \'a1\'');
content = content.replace(/accountName: 'Test Account'/g, 'account_name: \'Test Account\'');
content = content.replace(/payeeName: 'Test Payee'/g, 'payee_name: \'Test Payee\'');
content = content.replace(/importedPayee: 'Imported Test Payee'/g, 'imported_payee: \'Imported Test Payee\'');


// The mock input placeCache properties
content = content.replace(/supplementalRows: \[\]\n      \};/g, 'supplementalRows: [],\n        placeCache: { loadFromDisk: vi.fn().mockResolvedValue(undefined), mergeWithSupplementalRows: vi.fn(), writeToDisk: vi.fn().mockResolvedValue(undefined), getPlace: vi.fn(), setPlace: vi.fn(), _inMemoryCache: new Map(), cacheFilePath: \'\' } as unknown as import(\'./place-cache.js\').TimelinePlaceCacheFile,\n        categoryOverrides: { loadFromDisk: vi.fn().mockResolvedValue(undefined), getOverrideCategory: vi.fn(), writeToDisk: vi.fn().mockResolvedValue(undefined), setOverride: vi.fn(), getAllOverrides: vi.fn().mockReturnValue(new Map()), removeOverride: vi.fn(), _overrides: new Map(), overridesPath: \'\' } as unknown as import(\'./category-overrides.js\').TimelineCategoryOverridesFile\n      };');


fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed internal.test.ts');
