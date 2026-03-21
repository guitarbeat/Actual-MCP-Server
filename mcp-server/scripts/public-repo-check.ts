import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, '..');
const repoRoot = resolve(packageRoot, '..');

const FORBIDDEN_TRACKED_PATH_PREFIXES = ['.agent/', '.cursor/', '.jules/'];
const FORBIDDEN_TRACKED_PATHS = new Set(['.env', '.env.local', '.env.production']);
const CONTENT_SCAN_EXCLUDES = new Set(['mcp-server/scripts/public-repo-check.ts']);
const TEXT_FILE_EXTENSIONS = new Set([
  '',
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.sh',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);
const LOCAL_PATH_PATTERNS = [/\/Users\//, /C:\\Users\\/];
const FORBIDDEN_CONTENT_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: new RegExp(['MCP_PROXY_AUTH_', 'TOKEN='].join('')),
    message: 'Embedded MCP proxy auth token detected',
  },
  {
    pattern: new RegExp(
      ['I have started the MCP Inspector', ' in your local environment\\.'].join(''),
    ),
    message: 'Local-state inspector wording detected',
  },
];

function getTrackedFiles(): string[] {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  return output.split('\0').filter(Boolean);
}

function shouldScanFile(filePath: string): boolean {
  if (CONTENT_SCAN_EXCLUDES.has(filePath)) {
    return false;
  }

  const extension = extname(filePath);

  if (TEXT_FILE_EXTENSIONS.has(extension)) {
    return true;
  }

  return ['Dockerfile', 'LICENSE', 'README'].some((name) => filePath.endsWith(name));
}

function getTrackedPathFindings(files: string[]): string[] {
  const findings: string[] = [];

  files.forEach((filePath) => {
    if (FORBIDDEN_TRACKED_PATHS.has(filePath)) {
      findings.push(`Tracked environment file is not allowed: ${filePath}`);
    }

    if (FORBIDDEN_TRACKED_PATH_PREFIXES.some((prefix) => filePath.startsWith(prefix))) {
      findings.push(`Tracked local-assistant artifact is not allowed: ${filePath}`);
    }
  });

  return findings;
}

function getContentFindings(files: string[]): string[] {
  const findings: string[] = [];

  files.filter(shouldScanFile).forEach((filePath) => {
    const absolutePath = resolve(repoRoot, filePath);

    if (!existsSync(absolutePath)) {
      return;
    }

    const content = readFileSync(absolutePath, 'utf8');

    LOCAL_PATH_PATTERNS.forEach((pattern) => {
      if (pattern.test(content)) {
        findings.push(`Local machine path detected in ${filePath}`);
      }
    });

    FORBIDDEN_CONTENT_PATTERNS.forEach(({ pattern, message }) => {
      if (pattern.test(content)) {
        findings.push(`${message} in ${filePath}`);
      }
    });
  });

  return findings;
}

function main(): void {
  const trackedFiles = getTrackedFiles();
  const findings = [...getTrackedPathFindings(trackedFiles), ...getContentFindings(trackedFiles)];

  if (findings.length === 0) {
    console.log('Public repo check passed.');
    return;
  }

  console.error('Public repo check failed:');
  findings.forEach((finding) => {
    console.error(`- ${finding}`);
  });
  process.exitCode = 1;
}

main();
