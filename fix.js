const fs = require('fs');

// 1. types.ts
let path = 'mcp-server/src/core/api/actual-client/types.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /} from '@actual-app\/api\/@types\/loot-core\/src\/server\/api-models\.js';/,
  `} from '@actual-app/api/@types/loot-core/src/server/api-models.js';
import type { RuleEntity } from '@actual-app/api/@types/loot-core/src/types/models/rule.js';
import type { TransactionEntity } from '@actual-app/api/@types/loot-core/src/types/models/transaction.js';
import type { ImportTransactionsOpts } from '@actual-app/api/@types/methods.js';`
);

content = content.replace(
  /  APITagEntity,\n\};/,
  `  APITagEntity,\n  RuleEntity,\n  TransactionEntity,\n  ImportTransactionsOpts,\n};`
);
fs.writeFileSync(path, content);


// 2. actual-client.ts
path = 'mcp-server/src/core/api/actual-client.ts';
content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /const DEFAULT_DATA_DIR: string/,
  `export const DEFAULT_DATA_DIR: string`
);

content = content.replace(
  /  activeBudgetId: null,\n\};/,
  `  activeBudgetId: null,\n  lastErrorAt: null,\n};`
);
fs.writeFileSync(path, content);

// 3. sum-by.test.ts
path = 'mcp-server/src/core/aggregation/sum-by.test.ts';
content = fs.readFileSync(path, 'utf8');
content = content.replace(/\{ other: 20 \} as any/g, '{ other: 20 } as unknown as { val: number }');
fs.writeFileSync(path, content);

// 4. get-transactions/index.ts
path = 'mcp-server/src/tools/get-transactions/index.ts';
content = fs.readFileSync(path, 'utf8');
content = content.replace(/successWithJson, /g, '');
content = content.replace(/successWithJson\n/g, '\n');
fs.writeFileSync(path, content);

// 5. http.ts
path = 'mcp-server/src/runtime/http.ts';
content = fs.readFileSync(path, 'utf8');
content = content.replace(/getConnectionStatus/g, 'getConnectionState');
fs.writeFileSync(path, content);

console.log('Fixed all files');
