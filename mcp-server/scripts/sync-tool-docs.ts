import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAvailableTools, type ToolDefinition } from '../src/tools/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, '..');
const readmePath = resolve(packageRoot, 'README.md');
const docsDir = resolve(packageRoot, 'docs');
const registryPath = resolve(docsDir, 'tool-registry.md');
const toolSurfaceStart = '<!-- TOOL_SURFACE:START -->';
const toolSurfaceEnd = '<!-- TOOL_SURFACE:END -->';

function sortTools(tools: ToolDefinition[]): ToolDefinition[] {
  return [...tools].sort((left, right) => left.schema.name.localeCompare(right.schema.name));
}

function summarizeDescription(tool: ToolDefinition): string {
  return (tool.schema.description || 'No description available.')
    .split(/\\n|\n/)[0]
    .replace(/\s+/g, ' ')
    .trim();
}

function formatToolList(tools: ToolDefinition[]): string {
  return sortTools(tools)
    .map((tool) => `- \`${tool.schema.name}\`: ${summarizeDescription(tool)}`)
    .join('\n');
}

function buildToolCollections(): {
  readOnlyCore: ToolDefinition[];
  writeCore: ToolDefinition[];
  advanced: ToolDefinition[];
} {
  const readOnlyCore = getAvailableTools(false, false);
  const writeAndReadCore = getAvailableTools(true, false);
  const writeCore = writeAndReadCore.filter((tool) => tool.requiresWrite);
  const advanced = getAvailableTools(true, true).filter(
    (tool) => !writeAndReadCore.some((candidate) => candidate.schema.name === tool.schema.name),
  );

  return {
    readOnlyCore,
    writeCore,
    advanced,
  };
}

function buildReadmeToolSurface(): string {
  const { readOnlyCore, writeCore, advanced } = buildToolCollections();
  const total = readOnlyCore.length + writeCore.length + advanced.length;

  return [
    toolSurfaceStart,
    '',
    `Generated from \`src/tools/index.ts\`. The current registry exposes ${total} tools total:`,
    '',
    `- ${readOnlyCore.length} read-only core tools`,
    `- ${writeCore.length} write-enabled core tools`,
    `- ${advanced.length} advanced \`--enable-nini\` tools`,
    '',
    'The full generated inventory lives in [docs/tool-registry.md](docs/tool-registry.md).',
    '',
    toolSurfaceEnd,
  ].join('\n');
}

function buildRegistryDocument(): string {
  const { readOnlyCore, writeCore, advanced } = buildToolCollections();

  return [
    '# Tool Registry',
    '',
    'Generated from `src/tools/index.ts`. Edit the registry, then run `pnpm docs:generate`.',
    '',
    '## Read-Only Core',
    '',
    formatToolList(readOnlyCore),
    '',
    '## Write Core',
    '',
    formatToolList(writeCore),
    '',
    '## Advanced (`--enable-nini`)',
    '',
    formatToolList(advanced),
    '',
  ].join('\n');
}

function replaceMarkedSection(content: string, replacement: string): string {
  const startIndex = content.indexOf(toolSurfaceStart);
  const endIndex = content.indexOf(toolSurfaceEnd);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error('README is missing tool surface markers.');
  }

  return `${content.slice(0, startIndex)}${replacement}${content.slice(
    endIndex + toolSurfaceEnd.length,
  )}`;
}

function writeIfChanged(path: string, nextContent: string): boolean {
  const currentContent = readFileSync(path, 'utf8');

  if (currentContent === nextContent) {
    return false;
  }

  writeFileSync(path, nextContent);
  return true;
}

function main(): void {
  const shouldWrite = process.argv.includes('--write');
  const generatedReadmeSection = buildReadmeToolSurface();
  const nextReadme = replaceMarkedSection(readFileSync(readmePath, 'utf8'), generatedReadmeSection);
  const nextRegistry = buildRegistryDocument();

  mkdirSync(docsDir, { recursive: true });

  if (shouldWrite) {
    writeIfChanged(readmePath, nextReadme);
    writeFileSync(registryPath, nextRegistry);
    console.log('Tool documentation updated.');
    return;
  }

  const currentRegistry = readFileSync(registryPath, 'utf8');
  const readmeChanged = readFileSync(readmePath, 'utf8') !== nextReadme;
  const registryChanged = currentRegistry !== nextRegistry;

  if (readmeChanged || registryChanged) {
    console.error('Tool documentation is out of date. Run `pnpm docs:generate`.');
    process.exitCode = 1;
    return;
  }

  console.log('Tool documentation is in sync.');
}

main();
