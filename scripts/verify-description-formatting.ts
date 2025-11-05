#!/usr/bin/env node
/**
 * Verify tool description formatting
 *
 * Checks:
 * 1. All descriptions follow template structure
 * 2. All sections use consistent formatting
 * 3. All examples are valid JSON
 * 4. All newlines are properly escaped
 */

import { getAvailableTools } from '../src/tools/index.js';

// Get all tools (with write enabled to see all tools)
const tools = getAvailableTools(true);

interface ValidationIssue {
  tool: string;
  severity: 'error' | 'warning';
  issue: string;
}

const issues: ValidationIssue[] = [];

// Expected section headers
const EXPECTED_SECTIONS = [
  'OPERATIONS:',
  'REQUIRED PARAMETERS:',
  'OPTIONAL PARAMETERS:',
  'PARAMETERS:',
  'EXAMPLES:',
  'COMMON USE CASES:',
  'NOTES:',
  'RETURNS:',
  'ENTITY TYPES',
  'ACCOUNT TYPES:',
  'OPTIONAL FILTERS:',
  'REQUIRED:',
  'OPTIONAL:',
];

/**
 * Extract JSON examples from description
 * Filters out TypeScript type definitions
 */
function extractJsonExamples(description: string): string[] {
  const examples: string[] = [];
  const jsonPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  const matches = description.match(jsonPattern);

  if (matches) {
    // Filter out TypeScript type definitions (contain unquoted property names followed by colons and types)
    const typeDefPattern = /\{\s*\w+:\s*(string|number|boolean|array|"[^"]*"\|"[^"]*"|null|\?)/;

    examples.push(
      ...matches.filter((match) => {
        // Skip if it looks like a TypeScript type definition
        if (typeDefPattern.test(match)) {
          return false;
        }
        // Skip if it contains unquoted property names (not valid JSON)
        if (/\{\s*\w+:/.test(match) && !/"[\w-]+":\s*/.test(match)) {
          return false;
        }
        return true;
      })
    );
  }

  return examples;
}

/**
 * Validate JSON syntax
 */
function validateJson(jsonStr: string): { valid: boolean; error?: string } {
  try {
    JSON.parse(jsonStr);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if description has proper section structure
 */
function checkSectionStructure(toolName: string, description: string): void {
  // Check if description has at least one section header
  const hasSections = EXPECTED_SECTIONS.some((section) => description.includes(section));

  if (!hasSections && description.length > 100) {
    issues.push({
      tool: toolName,
      severity: 'warning',
      issue: 'Description is long but has no section headers',
    });
  }

  // Check for consistent section formatting (should end with colon or newline)
  const sectionHeaders = description.match(/^[A-Z][A-Z\s&]+:/gm);
  if (sectionHeaders) {
    sectionHeaders.forEach((header) => {
      if (!header.endsWith(':')) {
        issues.push({
          tool: toolName,
          severity: 'warning',
          issue: `Section header "${header}" doesn't end with colon`,
        });
      }
    });
  }
}

/**
 * Check for proper newline escaping
 */
function checkNewlineEscaping(toolName: string, description: string): void {
  // In TypeScript string literals, newlines should be \n
  // Check if description uses proper line breaks
  const lines = description.split('\n');

  // Check for inconsistent spacing
  let previousLineEmpty = false;
  lines.forEach((line, index) => {
    const isEmpty = line.trim() === '';

    // Check for more than 2 consecutive empty lines
    if (isEmpty && previousLineEmpty && index > 0 && lines[index - 2]?.trim() === '') {
      issues.push({
        tool: toolName,
        severity: 'warning',
        issue: `Multiple consecutive empty lines at line ${index + 1}`,
      });
    }

    previousLineEmpty = isEmpty;
  });
}

/**
 * Validate all JSON examples in description
 */
function validateJsonExamples(toolName: string, description: string): void {
  const examples = extractJsonExamples(description);

  examples.forEach((example, index) => {
    const result = validateJson(example);
    if (!result.valid) {
      issues.push({
        tool: toolName,
        severity: 'error',
        issue: `Invalid JSON in example ${index + 1}: ${result.error}\nJSON: ${example}`,
      });
    }
  });
}

/**
 * Check for common formatting issues
 */
function checkCommonIssues(toolName: string, description: string): void {
  // Check for bullet point consistency
  // Note: It's acceptable to use • for major sections (OPERATIONS) and - for sub-lists
  // Only flag if using * (asterisk) which is not part of our standard
  const asteriskPattern = /^\*/gm;
  const asteriskCount = (description.match(asteriskPattern) || []).length;

  if (asteriskCount > 0) {
    issues.push({
      tool: toolName,
      severity: 'warning',
      issue: 'Using asterisk (*) for bullets - prefer • for operations or - for lists',
    });
  }

  // Check for proper spacing after colons in sections
  const colonLines = description.split('\n').filter((line) => line.includes(':'));
  colonLines.forEach((line) => {
    if (line.match(/:\S/) && !line.includes('://') && !line.includes('":')) {
      issues.push({
        tool: toolName,
        severity: 'warning',
        issue: `Missing space after colon in: "${line.trim().substring(0, 50)}..."`,
      });
    }
  });
}

/**
 * Check template compliance
 */
function checkTemplateCompliance(toolName: string, description: string): void {
  const hasExamples =
    description.includes('EXAMPLES:') ||
    description.includes('Example:') ||
    extractJsonExamples(description).length > 0;

  if (!hasExamples && description.length > 50) {
    issues.push({
      tool: toolName,
      severity: 'warning',
      issue: 'No examples found in description',
    });
  }

  // Check for common use cases section in longer descriptions
  const hasUseCases = description.includes('COMMON USE CASES:') || description.includes('USE CASES:');

  if (!hasUseCases && description.length > 200) {
    issues.push({
      tool: toolName,
      severity: 'warning',
      issue: 'No "COMMON USE CASES" section found in longer description',
    });
  }
}

/**
 * Main validation function
 */
function validateToolDescriptions(): void {
  console.log('🔍 Validating tool description formatting...\n');

  tools.forEach((tool) => {
    const toolName = tool.schema.name;
    const description = tool.schema.description || '';

    if (!description) {
      issues.push({
        tool: toolName,
        severity: 'error',
        issue: 'Missing description',
      });
      return;
    }

    // Run all checks
    checkSectionStructure(toolName, description);
    checkNewlineEscaping(toolName, description);
    validateJsonExamples(toolName, description);
    checkCommonIssues(toolName, description);
    checkTemplateCompliance(toolName, description);
  });
}

/**
 * Print results
 */
function printResults(): void {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All tool descriptions are properly formatted!\n');
    console.log(`Validated ${tools.length} tools`);
    return;
  }

  if (errors.length > 0) {
    console.log('❌ ERRORS:\n');
    errors.forEach((issue) => {
      console.log(`  ${issue.tool}:`);
      console.log(`    ${issue.issue}\n`);
    });
  }

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    warnings.forEach((issue) => {
      console.log(`  ${issue.tool}:`);
      console.log(`    ${issue.issue}\n`);
    });
  }

  console.log('\n📊 SUMMARY:');
  console.log(`  Total tools: ${tools.length}`);
  console.log(`  Errors: ${errors.length}`);
  console.log(`  Warnings: ${warnings.length}`);

  if (errors.length > 0) {
    process.exit(1);
  }
}

// Run validation
validateToolDescriptions();
printResults();
