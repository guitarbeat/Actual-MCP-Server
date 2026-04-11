import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PromptDefinition } from '../src/mcp/prompts/index.js';
import type { ResourceDefinition } from '../src/mcp/resources/index.js';
import type { DeclarativeToolDefinition } from '../src/mcp/tools/common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, '..');
const readmePath = resolve(packageRoot, 'README.md');
const docsDir = resolve(packageRoot, 'docs');
const registryPath = resolve(docsDir, 'tool-registry.md');
const toolSurfaceStart = '<!-- TOOL_SURFACE:START -->';
const toolSurfaceEnd = '<!-- TOOL_SURFACE:END -->';

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name));
}

function summarizeDescription(description?: string): string {
  return (description || 'No description available.')
    .split(/\\n|\n/)[0]
    .replace(/\s+/g, ' ')
    .trim();
}

function formatToolList(tools: DeclarativeToolDefinition[]): string {
  return sortByName(tools)
    .map((tool) => `- \`${tool.name}\`: ${summarizeDescription(tool.description)}`)
    .join('\n');
}

function formatPromptList(prompts: PromptDefinition[]): string {
  return sortByName(prompts)
    .map((prompt) => `- \`${prompt.name}\`: ${summarizeDescription(prompt.description)}`)
    .join('\n');
}

function formatResourceList(resources: ResourceDefinition[]): string {
  return [...resources]
    .sort((left, right) => left.uri.localeCompare(right.uri))
    .map(
      (resource) =>
        `- \`${resource.uri}\` (${resource.kind}): ${resource.name}. ${summarizeDescription(resource.description)}`,
    )
    .join('\n');
}

async function loadMcpSurface() {
  if (!('navigator' in globalThis)) {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: process.platform },
      configurable: true,
    });
  }

  const [toolModule, promptModule, resourceModule] = await Promise.all([
    import('../src/mcp/tools/index.js'),
    import('../src/mcp/prompts/index.js'),
    import('../src/mcp/resources/index.js'),
  ]);

  return {
    getToolDefinitions: toolModule.getToolDefinitions,
    promptDefinitions: promptModule.promptDefinitions,
    resourceDefinitions: resourceModule.resourceDefinitions,
  };
}

async function buildToolCollections(): Promise<{
  readOnlyCore: DeclarativeToolDefinition[];
  writeCore: DeclarativeToolDefinition[];
  advanced: DeclarativeToolDefinition[];
  prompts: PromptDefinition[];
  resources: ResourceDefinition[];
}> {
  const { getToolDefinitions, promptDefinitions, resourceDefinitions } = await loadMcpSurface();
  const readOnlyCore = getToolDefinitions({ enableWrite: false, enableAdvanced: false });
  const writeAndReadCore = getToolDefinitions({ enableWrite: true, enableAdvanced: false });
  const writeCore = writeAndReadCore.filter((tool) => tool.requiresWrite);
  const advanced = getToolDefinitions({ enableWrite: true, enableAdvanced: true }).filter(
    (tool) => !writeAndReadCore.some((candidate) => candidate.name === tool.name),
  );

  return {
    readOnlyCore,
    writeCore,
    advanced,
    prompts: promptDefinitions,
    resources: resourceDefinitions,
  };
}

async function buildReadmeToolSurface(): Promise<string> {
  const { readOnlyCore, writeCore, advanced, prompts, resources } = await buildToolCollections();
  const total = readOnlyCore.length + writeCore.length + advanced.length;
  const staticResources = resources.filter((resource) => resource.kind === 'static');
  const templateResources = resources.filter((resource) => resource.kind === 'template');

  return [
    toolSurfaceStart,
    '',
    `Generated from the declarative MCP modules under \`src/mcp/\`. The current surface exposes ${total} tools, ${prompts.length} prompts, and ${resources.length} resources:`,
    '',
    `- ${readOnlyCore.length} read-only core tools`,
    `- ${writeCore.length} write-enabled core tools`,
    `- ${advanced.length} advanced \`--enable-advanced\` tools`,
    `- ${prompts.length} prompts`,
    `- ${staticResources.length} static resources`,
    `- ${templateResources.length} templated resources`,
    '',
    'The full generated inventory lives in [docs/tool-registry.md](docs/tool-registry.md).',
    '',
    toolSurfaceEnd,
  ].join('\n');
}

async function buildRegistryDocument(): Promise<string> {
  const { readOnlyCore, writeCore, advanced, prompts, resources } = await buildToolCollections();

  return [
    '# MCP Surface Registry',
    '',
    'Generated from the declarative MCP modules in `src/mcp/`. Edit those modules, then run `pnpm docs:generate`.',
    '',
    '## Read-Only Core',
    '',
    formatToolList(readOnlyCore),
    '',
    '## Write Core',
    '',
    formatToolList(writeCore),
    '',
    '## Advanced (`--enable-advanced`)',
    '',
    formatToolList(advanced),
    '',
    '## Prompts',
    '',
    formatPromptList(prompts),
    '',
    '## Resources',
    '',
    formatResourceList(resources),
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

async function main(): Promise<void> {
  const shouldWrite = process.argv.includes('--write');
  const generatedReadmeSection = await buildReadmeToolSurface();
  const nextReadme = replaceMarkedSection(readFileSync(readmePath, 'utf8'), generatedReadmeSection);
  const nextRegistry = await buildRegistryDocument();

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

void main();
