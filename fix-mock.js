const fs = require('fs');
const path = require('path');

const testFile = path.join(__dirname, 'mcp-server/src/runtime/http.test.ts');
let testContent = fs.readFileSync(testFile, 'utf8');

// The test mocks still contain `mockGetConnectionStatus`. We need to properly alias `getConnectionState` inside the test file's mock block
// since we changed it in `http.ts`. But in http.ts we used `getConnectionState`, so `vi.mock` mapping `getConnectionState: mockGetConnectionState` is correct.

// Let's check how the 500 test fails:
//   it('should return 500 when diagnostics are unavailable', async () => {
//     mockGetConnectionState.mockImplementation(() => { throw new Error('Test error'); });
// ...
// Does the mock get reset after this? No, it's just called.
// Why doesn't `app.get('/diagnostics')` hit the `catch` block and return 500?
// Wait, looking at http.ts:
//       // @ts-expect-error - compatibility
//       const connectionInfo = (typeof getConnectionStatus === 'function' ? getConnectionStatus : getConnectionState)();
// Is `getConnectionStatus` still defined somewhere globally or imported?
// Let's just remove the fallback in http.ts because it's confusing.

const httpFile = path.join(__dirname, 'mcp-server/src/runtime/http.ts');
let httpContent = fs.readFileSync(httpFile, 'utf8');

httpContent = httpContent.replace(
  "      // @ts-expect-error - compatibility\n      const connectionInfo = (typeof getConnectionStatus === 'function' ? getConnectionStatus : getConnectionState)();",
  "      const connectionState = getConnectionState();\n      if (!connectionState) throw new Error('Unavailable');\n      const connectionInfo = {\n        status: connectionState.status,\n        budgetId: connectionState.activeBudgetId,\n        initialized: connectionState.status === 'ready',\n      };"
);

fs.writeFileSync(httpFile, httpContent);

testContent = testContent.replace(
  "mockGetConnectionState.mockImplementation(() => { throw new Error('Test error'); });",
  "mockGetConnectionState.mockImplementation(() => { throw new Error('Test error'); });"
);

fs.writeFileSync(testFile, testContent);
