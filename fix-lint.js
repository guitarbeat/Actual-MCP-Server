const fs = require('fs');
const p = 'mcp-server/src/tools/get-transactions/index.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/import \{ success, successWithJson \} from '\.\.\/\.\.\/core\/response\/response-builder\.js';/, "import { success } from '../../core/response/response-builder.js';");
fs.writeFileSync(p, c);
