const fs = require('fs');

const path = 'mcp-server/src/runtime/http.test.ts';
let content = fs.readFileSync(path, 'utf8');

// I also need to update the diagnostics assertion
content = content.replace(
  /const data = await response\.json\(\);\n    expect\(data\)\.toEqual\(\{ error: 'diagnostics unavailable' \}\);/g,
  `const data = await response.json();
    expect(data).toEqual({ error: 'Failed to retrieve diagnostics' });`
);

fs.writeFileSync(path, content);
