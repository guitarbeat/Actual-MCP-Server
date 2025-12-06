#!/usr/bin/env tsx
/**
 * Validates all tool names against MCP specification requirements.
 *
 * MCP Tool Name Requirements:
 * - 1-128 characters (inclusive)
 * - Case-sensitive
 * - Allowed characters: A-Z, a-z, 0-9, underscore (_), hyphen (-), dot (.)
 * - Should NOT contain spaces, commas, or other special characters
 * - Should be unique within a server
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TOOL_NAME_REGEX = /^[A-Za-z0-9_.-]+$/;
const MIN_LENGTH = 1;
const MAX_LENGTH = 128;

interface ToolNameIssue {
  toolName: string;
  file: string;
  issue: string;
}

const issues: ToolNameIssue[] = [];
const toolNames = new Map<string, string>(); // name -> file

/**
 * Extract tool names from a TypeScript file
 * Looks for tool schema definitions: export const schema = { name: '...' }
 * Ignores comments and example code
 */
function extractToolNames(filePath: string, content: string): string[] {
  const names: string[] = [];

  // Remove comments to avoid false positives from examples
  const withoutComments = content
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, ''); // Remove line comments

  // Match tool schema definitions: export const schema = { name: 'tool-name', ... }
  // This pattern matches schema objects that are likely tool definitions
  const schemaPattern = /export\s+const\s+schema\s*=\s*\{[^}]*name:\s*['"]([^'"]+)['"]/gs;
  let match;
  while ((match = schemaPattern.exec(withoutComments)) !== null) {
    names.push(match[1]);
  }

  return names;
}

/**
 * Validate a single tool name
 */
function validateToolName(name: string, file: string): string | null {
  // Check length
  if (name.length < MIN_LENGTH) {
    return `Tool name is too short (minimum ${MIN_LENGTH} character)`;
  }
  if (name.length > MAX_LENGTH) {
    return `Tool name is too long (maximum ${MAX_LENGTH} characters, got ${name.length})`;
  }

  // Check allowed characters
  if (!TOOL_NAME_REGEX.test(name)) {
    const invalidChars = name
      .split('')
      .filter((char) => !/[A-Za-z0-9_.-]/.test(char))
      .filter((char, index, arr) => arr.indexOf(char) === index); // unique
    return `Tool name contains invalid characters: ${invalidChars.map((c) => `'${c}'`).join(', ')}. Allowed: A-Z, a-z, 0-9, _, -, .`;
  }

  // Check for spaces
  if (name.includes(' ')) {
    return 'Tool name contains spaces (not allowed)';
  }

  // Check for commas
  if (name.includes(',')) {
    return 'Tool name contains commas (not allowed)';
  }

  return null;
}

/**
 * Scan tools directory for tool definitions
 */
function scanToolsDirectory(dir: string): void {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively scan subdirectories
      scanToolsDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      // Read and parse TypeScript files (skip test files)
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const toolNamesInFile = extractToolNames(fullPath, content);

        for (const toolName of toolNamesInFile) {
          // Validate the tool name
          const issue = validateToolName(toolName, fullPath);
          if (issue) {
            issues.push({
              toolName,
              file: fullPath,
              issue,
            });
          }

          // Check for duplicates
          if (toolNames.has(toolName)) {
            issues.push({
              toolName,
              file: fullPath,
              issue: `Duplicate tool name. Also defined in: ${toolNames.get(toolName)}`,
            });
          } else {
            toolNames.set(toolName, fullPath);
          }
        }
      } catch (error) {
        console.error(`Error reading ${fullPath}:`, error);
      }
    }
  }
}

/**
 * Main validation function
 */
function main(): void {
  const toolsDir = join(process.cwd(), 'src', 'tools');

  if (!existsSync(toolsDir)) {
    console.error(`Tools directory not found: ${toolsDir}`);
    process.exit(1);
  }

  console.log('🔍 Scanning tool definitions...\n');
  scanToolsDirectory(toolsDir);

  // Also check CRUD factory config for entity names
  // Only check actual entityConfigurations object, not comments
  const crudConfigPath = join(process.cwd(), 'src', 'tools', 'crud-factory-config.ts');
  if (existsSync(crudConfigPath)) {
    const content = readFileSync(crudConfigPath, 'utf-8');
    
    // Remove comments to avoid false positives
    const withoutComments = content
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, ''); // Remove line comments
    
    // Match entityName: 'name' patterns that are NOT in comments
    // Look for the pattern: entityName: 'value' (with proper spacing)
    const entityNamePattern = /\bentityName:\s*['"]([^'"]+)['"]/g;
    let match;
    const foundEntityNames = new Set<string>();
    
    while ((match = entityNamePattern.exec(withoutComments)) !== null) {
      const entityName = match[1];
      // Skip if it's in an example comment (widget is only in examples)
      if (entityName === 'widget') {
        continue;
      }
      foundEntityNames.add(entityName);
    }
    
    // Generate CRUD tool names for each entity
    for (const entityName of foundEntityNames) {
      const crudNames = [
        `create-${entityName}`,
        `update-${entityName}`,
        `delete-${entityName}`,
      ];

      for (const toolName of crudNames) {
        const issue = validateToolName(toolName, crudConfigPath);
        if (issue) {
          issues.push({
            toolName,
            file: crudConfigPath,
            issue: `Generated CRUD tool name: ${issue}`,
          });
        }

        if (toolNames.has(toolName)) {
          issues.push({
            toolName,
            file: crudConfigPath,
            issue: `Duplicate tool name. Also defined in: ${toolNames.get(toolName)}`,
          });
        } else {
          toolNames.set(toolName, crudConfigPath);
        }
      }
    }
  }

  // Report results
  console.log(`📊 Found ${toolNames.size} unique tool names\n`);

  if (issues.length === 0) {
    console.log('✅ All tool names are valid!\n');
    console.log('Tool names:');
    const sortedNames = Array.from(toolNames.keys()).sort();
    for (const name of sortedNames) {
      console.log(`  - ${name}`);
    }
    process.exit(0);
  } else {
    console.error(`❌ Found ${issues.length} issue(s):\n`);
    for (const issue of issues) {
      console.error(`  Tool: ${issue.toolName}`);
      console.error(`  File: ${issue.file}`);
      console.error(`  Issue: ${issue.issue}\n`);
    }
    process.exit(1);
  }
}

main();
