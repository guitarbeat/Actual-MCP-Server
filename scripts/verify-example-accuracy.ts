#!/usr/bin/env node
/**
 * Verify Example Accuracy Script
 *
 * Validates that all JSON examples in tool descriptions are:
 * 1. Syntactically valid JSON
 * 2. Match the tool's input schema
 * 3. Demonstrate realistic use cases
 * 4. Include all required fields
 */

import { getAvailableTools } from '../src/tools/index.js';

// Get all tools (with write enabled to get full list)
const tools = getAvailableTools(true);

interface ValidationIssue {
  tool: string;
  severity: 'error' | 'warning';
  issue: string;
  example?: string;
}

const issues: ValidationIssue[] = [];

/**
 * Extract JSON examples from a tool description
 * Extracts complete tool examples while avoiding nested objects
 */
function extractExamples(description: string): string[] {
  const examples: string[] = [];

  // Split by lines and look for example patterns
  const lines = description.split('\\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for lines that contain JSON objects
    const jsonMatch = line.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];

      // Skip if it's clearly a nested object or type definition
      // Valid examples should have quoted keys and be reasonably long
      if (
        jsonStr.length > 20 &&
        jsonStr.includes('"') &&
        !jsonStr.includes(': string') &&
        !jsonStr.includes(': number')
      ) {
        // Additional check: should have at least one colon followed by a value
        if (/"\s*:\s*["\[\{]/.test(jsonStr)) {
          examples.push(jsonStr);
        }
      }
    }
  }

  return examples;
}

/**
 * Validate that a JSON string is syntactically valid
 */
function validateJsonSyntax(jsonStr: string, toolName: string): boolean {
  try {
    JSON.parse(jsonStr);
    return true;
  } catch (error) {
    issues.push({
      tool: toolName,
      severity: 'error',
      issue: `Invalid JSON syntax: ${error instanceof Error ? error.message : 'Unknown error'}`,
      example: jsonStr.substring(0, 100) + (jsonStr.length > 100 ? '...' : ''),
    });
    return false;
  }
}

/**
 * Validate that an example matches the tool's input schema
 */
function validateAgainstSchema(example: any, schema: any, toolName: string, exampleStr: string): void {
  if (!schema || !schema.properties) {
    return;
  }

  // Check required fields
  if (schema.required && Array.isArray(schema.required)) {
    for (const requiredField of schema.required) {
      if (!(requiredField in example)) {
        issues.push({
          tool: toolName,
          severity: 'error',
          issue: `Missing required field: ${requiredField}`,
          example: exampleStr.substring(0, 100),
        });
      }
    }
  }

  // Check field types
  for (const [key, value] of Object.entries(example)) {
    const propertySchema = schema.properties[key];

    if (!propertySchema) {
      issues.push({
        tool: toolName,
        severity: 'warning',
        issue: `Field "${key}" not in schema`,
        example: exampleStr.substring(0, 100),
      });
      continue;
    }

    // Validate type
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    const expectedType = propertySchema.type;

    if (expectedType && actualType !== expectedType && !(value === null && !schema.required?.includes(key))) {
      issues.push({
        tool: toolName,
        severity: 'error',
        issue: `Field "${key}" has type ${actualType}, expected ${expectedType}`,
        example: exampleStr.substring(0, 100),
      });
    }

    // Validate enum values
    if (propertySchema.enum && !propertySchema.enum.includes(value)) {
      issues.push({
        tool: toolName,
        severity: 'error',
        issue: `Field "${key}" value "${value}" not in enum: ${propertySchema.enum.join(', ')}`,
        example: exampleStr.substring(0, 100),
      });
    }
  }
}

/**
 * Check if an example demonstrates a realistic use case
 */
function validateRealisticUseCase(example: any, toolName: string, exampleStr: string): void {
  // Check for placeholder values that suggest unrealistic examples
  const placeholderPatterns = [/^(xxx|yyy|zzz|abc|test|example|placeholder|dummy)/i, /^(id|name|value)\d+$/i];

  for (const [key, value] of Object.entries(example)) {
    if (typeof value === 'string') {
      for (const pattern of placeholderPatterns) {
        if (pattern.test(value)) {
          issues.push({
            tool: toolName,
            severity: 'warning',
            issue: `Field "${key}" has placeholder-like value: "${value}"`,
            example: exampleStr.substring(0, 100),
          });
        }
      }
    }
  }

  // Check for empty objects or arrays where data is expected
  if (example.data && typeof example.data === 'object' && Object.keys(example.data).length === 0) {
    issues.push({
      tool: toolName,
      severity: 'warning',
      issue: 'Example has empty "data" object',
      example: exampleStr.substring(0, 100),
    });
  }
}

/**
 * Main validation function
 */
function validateTool(tool: any): void {
  const toolName = tool.schema.name;
  const description = tool.schema.description || '';
  const schema = tool.schema.inputSchema;

  // Extract examples from description
  const examples = extractExamples(description);

  if (examples.length === 0) {
    issues.push({
      tool: toolName,
      severity: 'warning',
      issue: 'No JSON examples found in description',
    });
    return;
  }

  console.log(`\n📋 Validating ${toolName} (${examples.length} examples)...`);

  // Validate each example
  for (const exampleStr of examples) {
    // 1. Validate JSON syntax
    if (!validateJsonSyntax(exampleStr, toolName)) {
      continue; // Skip further validation if JSON is invalid
    }

    const example = JSON.parse(exampleStr);

    // 2. Validate against schema
    validateAgainstSchema(example, schema, toolName, exampleStr);

    // 3. Validate realistic use case
    validateRealisticUseCase(example, toolName, exampleStr);
  }
}

/**
 * Generate report
 */
function generateReport(): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 EXAMPLE ACCURACY VALIDATION REPORT');
  console.log('='.repeat(80));

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  console.log(`\n✅ Tools validated: ${tools.length}`);
  console.log(`❌ Errors found: ${errors.length}`);
  console.log(`⚠️  Warnings found: ${warnings.length}`);

  if (errors.length > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log('❌ ERRORS:');
    console.log('─'.repeat(80));

    for (const issue of errors) {
      console.log(`\n🔴 ${issue.tool}`);
      console.log(`   Issue: ${issue.issue}`);
      if (issue.example) {
        console.log(`   Example: ${issue.example}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log('⚠️  WARNINGS:');
    console.log('─'.repeat(80));

    for (const issue of warnings) {
      console.log(`\n🟡 ${issue.tool}`);
      console.log(`   Issue: ${issue.issue}`);
      if (issue.example) {
        console.log(`   Example: ${issue.example}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All examples are valid!');
  } else if (errors.length === 0) {
    console.log('✅ No critical errors found (warnings can be addressed)');
  } else {
    console.log('❌ Critical errors found - please fix before proceeding');
  }

  console.log('='.repeat(80) + '\n');
}

// Run validation
console.log('🔍 Starting example accuracy validation...');

for (const tool of tools) {
  validateTool(tool);
}

generateReport();

// Exit with error code if there are errors
if (issues.some((i) => i.severity === 'error')) {
  process.exit(1);
}
