const fs = require('fs');

// http.ts
let path = 'mcp-server/src/runtime/http.ts';
let content = fs.readFileSync(path, 'utf8');

// I am putting the diagnostics endpoint back to its original shape exactly
// to avoid further test failures related to diagnostics.

content = content.replace(
  /app\.get\('\/diagnostics', async \(c\) => \{[\s\S]*?\} catch \(error\) \{[\s\S]*?\}\n  \}\);/,
  `app.get('/diagnostics', (c) => {
    try {
      const connectionInfo = getConnectionState();
      return c.json({
        connection: connectionInfo,
        server: {
          uptime: process.uptime(),
          nodeVersion: process.version,
        },
        config: {
          serverUrl: process.env.ACTUAL_SERVER_URL
            ? process.env.ACTUAL_SERVER_URL.replace(/:\\/\\/[^@]+@/, '://***:***@')
            : null,
          hasPassword: !!process.env.ACTUAL_PASSWORD,
          hasBudgetId: !!process.env.ACTUAL_SYNC_ID,
          dataDir: DEFAULT_DATA_DIR,
        },
      });
    } catch (error) {
      console.error('Diagnostics endpoint failed:', error);
      return c.json({ error: 'diagnostics unavailable' }, 500);
    }
  });`
);

fs.writeFileSync(path, content);
console.log('Fixed http.ts');
