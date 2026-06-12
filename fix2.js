const fs = require('fs');

let path = 'mcp-server/src/runtime/http.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/getConnectionState,\n  getReadinessStatus,\n  getConnectionState,\n  DEFAULT_DATA_DIR,/, 'getConnectionState,\n  getReadinessStatus,\n  DEFAULT_DATA_DIR,');
fs.writeFileSync(path, content);
