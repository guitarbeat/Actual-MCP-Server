import { once } from 'node:events';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, '..');

async function getFreePort(): Promise<number> {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();

  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Failed to allocate a free port for startup smoke test.');
  }

  const { port } = address;
  server.close();
  await once(server, 'close');
  return port;
}

async function waitForHealth(port: number, attempts = 30): Promise<void> {
  const url = `http://127.0.0.1:${port}/health`;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        return;
      }
      lastError = new Error(`/health returned ${response.status}`);
    } catch {
      lastError = new Error(`Server is still starting on attempt ${attempt + 1}.`);
    }

    await delay(250);
  }

  throw new Error(
    `Server did not become healthy on ${url}.${lastError ? ` Last error: ${String(lastError)}` : ''}`,
  );
}

async function waitForListening(
  child: ReturnType<typeof spawn>,
  port: number,
  getLogs: () => string,
  getChildError: () => Error | null,
): Promise<void> {
  const listeningPattern = `MCP server listening on http://`;
  const listeningSuffix = `:${port}/mcp`;
  const start = Date.now();
  const timeoutMs = 30000;

  while (Date.now() - start < timeoutMs) {
    const childError = getChildError();
    if (childError) {
      throw new Error(
        `Server failed to spawn.\n${childError.stack || childError.message}\n${getLogs()}`,
      );
    }

    if (child.exitCode !== null) {
      throw new Error(`Server exited before listening.\n${getLogs()}`);
    }

    const logs = getLogs();
    if (logs.includes(listeningPattern) && logs.includes(listeningSuffix)) {
      return;
    }

    await delay(100);
  }

  throw new Error(
    `Server did not announce its listener on port ${port} within ${timeoutMs}ms.\n${getLogs()}`,
  );
}

async function main(): Promise<void> {
  const port = await getFreePort();
  const child = spawn(
    process.execPath,
    ['build/index.js', '--sse', '--enable-bearer', '--port', String(port)],
    {
      cwd: packageRoot,
      env: {
        ...process.env,
        BEARER_TOKEN: 'a'.repeat(32),
        PERFORMANCE_LOGGING_ENABLED: 'false',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  let stderr = '';
  let stdout = '';
  let childError: Error | null = null;
  child.on('error', (error) => {
    childError = error;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  const formatLogs = (): string =>
    `stdout:\n${stdout || '(empty)'}\n\nstderr:\n${stderr || '(empty)'}`;

  try {
    await waitForListening(child, port, formatLogs, () => childError);
    await waitForHealth(port, 60);

    const healthResponse = await fetch(`http://127.0.0.1:${port}/health`);
    if (!healthResponse.ok) {
      throw new Error(`/health returned ${healthResponse.status}`);
    }

    const unauthorizedResponse = await fetch(`http://127.0.0.1:${port}/mcp`);
    if (unauthorizedResponse.status !== 401) {
      throw new Error(`/mcp returned ${unauthorizedResponse.status} instead of 401`);
    }

    console.log('Startup smoke test passed.');
  } finally {
    child.kill('SIGTERM');
    await Promise.race([once(child, 'exit'), delay(5000)]);
  }

  if (child.exitCode && child.exitCode !== 0) {
    throw new Error(`Server exited with code ${child.exitCode}.\n${formatLogs()}`);
  }
}

void main();
