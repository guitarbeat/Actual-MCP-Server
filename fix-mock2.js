const fs = require('fs');
const path = require('path');

const testFile = path.join(__dirname, 'mcp-server/src/runtime/http.test.ts');
let testContent = fs.readFileSync(testFile, 'utf8');

testContent = testContent.replace(
  "// @ts-expect-error compatibility\n    (typeof mockGetConnectionStatus === 'function' ? mockGetConnectionStatus : mockGetConnectionState).mockImplementation(() => {\n      throw new Error('Test error');\n    });",
  "mockGetConnectionState.mockImplementation(() => {\n      throw new Error('Test error');\n    });"
);

fs.writeFileSync(testFile, testContent);
