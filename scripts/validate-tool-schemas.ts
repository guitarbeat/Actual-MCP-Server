/**
 * Validation script for tool schemas
 * Verifies that tool descriptions and input schemas meet quality standards
 */

import * as manageEntity from '../src/tools/manage-entity/index.js';
import * as manageTransaction from '../src/tools/manage-transaction/index.js';
import * as manageAccount from '../src/tools/manage-account/index.js';

interface ValidationResult {
  tool: string;
  passed: boolean;
  issues: string[];
  warnings: string[];
}

function validateToolSchema(toolName: string, schema: any): ValidationResult {
  const result: ValidationResult = {
    tool: toolName,
    passed: true,
    issues: [],
    warnings: [],
  };

  // Check basic schema structure
  if (!schema.name) {
    result.issues.push('Missing schema name');
    result.passed = false;
  }

  if (!schema.description) {
    result.issues.push('Missing description');
    result.passed = false;
  }

  if (!schema.inputSchema) {
    result.issues.push('Missing inputSchema');
    result.passed = false;
  }

  // Check description quality
  if (schema.description) {
    const desc = schema.description;

    // Check for key sections
    if (!desc.includes('OPERATIONS') && !desc.includes('REQUIRED')) {
      result.warnings.push('Missing OPERATIONS or REQUIRED section');
    }

    if (!desc.includes('COMMON USE CASES')) {
      result.warnings.push('Missing COMMON USE CASES section');
    }

    if (!desc.includes('NOTES') && !desc.includes('NOTE')) {
      result.warnings.push('Missing NOTES section');
    }

    // Check for examples
    if (!desc.includes('Example:') && !desc.includes('example:')) {
      result.warnings.push('Missing examples in description');
    }

    // Check description length (should be comprehensive)
    if (desc.length < 500) {
      result.warnings.push(`Description is short (${desc.length} chars) - may lack detail`);
    }
  }

  // Check input schema quality
  if (schema.inputSchema && schema.inputSchema.properties) {
    const props = schema.inputSchema.properties;
    const propCount = Object.keys(props).length;

    if (propCount === 0) {
      result.warnings.push('No properties in input schema');
    }

    // Check each property has a description
    for (const [propName, propDef] of Object.entries(props)) {
      const prop = propDef as any;
      if (!prop.description) {
        result.issues.push(`Property '${propName}' missing description`);
        result.passed = false;
      }
    }
  }

  return result;
}

function validateExamples(toolName: string, description: string): ValidationResult {
  const result: ValidationResult = {
    tool: toolName,
    passed: true,
    issues: [],
    warnings: [],
  };

  // Extract JSON examples from description
  const jsonPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  const examples = description.match(jsonPattern) || [];

  if (examples.length === 0) {
    result.warnings.push('No JSON examples found in description');
    return result;
  }

  // Validate each example
  examples.forEach((example, index) => {
    try {
      JSON.parse(example);
    } catch (e) {
      result.issues.push(`Example ${index + 1} is invalid JSON: ${example.substring(0, 50)}...`);
      result.passed = false;
    }
  });

  return result;
}

// Run validations
console.log('🔍 Validating Critical Tool Schemas\n');
console.log('='.repeat(80));

const tools = [
  { name: 'manage-entity', module: manageEntity },
  { name: 'manage-transaction', module: manageTransaction },
  { name: 'manage-account', module: manageAccount },
];

let allPassed = true;

for (const tool of tools) {
  console.log(`\n📋 ${tool.name}`);
  console.log('-'.repeat(80));

  // Validate schema structure
  const schemaResult = validateToolSchema(tool.name, tool.module.schema);

  // Validate examples
  const examplesResult = validateExamples(tool.name, tool.module.schema.description || '');

  // Print results
  if (schemaResult.issues.length > 0) {
    console.log('❌ Issues:');
    schemaResult.issues.forEach((issue) => console.log(`   - ${issue}`));
    allPassed = false;
  }

  if (examplesResult.issues.length > 0) {
    console.log('❌ Example Issues:');
    examplesResult.issues.forEach((issue) => console.log(`   - ${issue}`));
    allPassed = false;
  }

  if (schemaResult.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    schemaResult.warnings.forEach((warning) => console.log(`   - ${warning}`));
  }

  if (examplesResult.warnings.length > 0) {
    console.log('⚠️  Example Warnings:');
    examplesResult.warnings.forEach((warning) => console.log(`   - ${warning}`));
  }

  if (
    schemaResult.issues.length === 0 &&
    examplesResult.issues.length === 0 &&
    schemaResult.warnings.length === 0 &&
    examplesResult.warnings.length === 0
  ) {
    console.log('✅ All checks passed');
  }

  // Print stats
  const desc = tool.module.schema.description || '';
  const jsonExamples = desc.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
  const propCount = Object.keys(tool.module.schema.inputSchema?.properties || {}).length;

  console.log(`\n📊 Stats:`);
  console.log(`   - Description length: ${desc.length} characters`);
  console.log(`   - JSON examples: ${jsonExamples.length}`);
  console.log(`   - Input properties: ${propCount}`);
}

console.log('\n' + '='.repeat(80));
if (allPassed) {
  console.log('✅ All validations passed!');
  process.exit(0);
} else {
  console.log('❌ Some validations failed');
  process.exit(1);
}
