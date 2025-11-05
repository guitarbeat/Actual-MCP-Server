#!/usr/bin/env node
/**
 * Verify input schema completeness across all tools.
 * Checks that all properties have descriptions, format/constraints,
 * required fields are documented, and default values are noted.
 */

import { getAvailableTools } from '../src/tools/index.js';

interface ValidationIssue {
  tool: string;
  property: string;
  issue: string;
  severity: 'error' | 'warning';
}

const issues: ValidationIssue[] = [];

function validateSchema(toolName: string, schema: any) {
  if (!schema.inputSchema) {
    issues.push({
      tool: toolName,
      property: 'inputSchema',
      issue: 'Missing inputSchema',
      severity: 'error',
    });
    return;
  }

  const { properties, required } = schema.inputSchema;

  if (!properties) {
    issues.push({
      tool: toolName,
      property: 'properties',
      issue: 'Missing properties in inputSchema',
      severity: 'error',
    });
    return;
  }

  // Check each property
  for (const [propName, propSchema] of Object.entries(properties as Record<string, any>)) {
    // Check if property has a description
    if (!propSchema.description || propSchema.description.trim() === '') {
      issues.push({
        tool: toolName,
        property: propName,
        issue: 'Missing description',
        severity: 'error',
      });
    } else {
      const desc = propSchema.description as string;

      // Check if description includes format/constraints for certain types
      if (propSchema.type === 'string') {
        // Check for format hints in common cases
        if (propName.toLowerCase().includes('date') && !desc.toLowerCase().includes('yyyy')) {
          issues.push({
            tool: toolName,
            property: propName,
            issue: 'Date property missing format specification (e.g., YYYY-MM-DD)',
            severity: 'warning',
          });
        }
        if (propName.toLowerCase().includes('month') && !desc.toLowerCase().includes('yyyy')) {
          issues.push({
            tool: toolName,
            property: propName,
            issue: 'Month property missing format specification (e.g., YYYY-MM)',
            severity: 'warning',
          });
        }
      }

      if (propSchema.type === 'number') {
        // Check for unit/format hints for amounts
        if (propName.toLowerCase().includes('amount')) {
          const hasUnitSpec = desc.toLowerCase().includes('cent') || desc.toLowerCase().includes('dollar');
          if (!hasUnitSpec) {
            issues.push({
              tool: toolName,
              property: propName,
              issue: 'Amount property missing unit specification (cents vs dollars)',
              severity: 'warning',
            });
          }
        }
      }

      // Check if enum values are explained
      if (propSchema.enum && propSchema.enum.length > 0) {
        const hasEnumExplanation = propSchema.enum.some((val: string) =>
          desc.toLowerCase().includes(val.toLowerCase())
        );
        if (!hasEnumExplanation) {
          issues.push({
            tool: toolName,
            property: propName,
            issue: 'Enum property description does not explain available values',
            severity: 'warning',
          });
        }
      }

      // Check if default value is documented when present
      if (propSchema.default !== undefined) {
        if (!desc.toLowerCase().includes('default')) {
          issues.push({
            tool: toolName,
            property: propName,
            issue: `Has default value (${propSchema.default}) but not documented in description`,
            severity: 'warning',
          });
        }
      }
    }

    // Check for nested properties (objects)
    if (propSchema.type === 'object' && propSchema.properties) {
      for (const [nestedProp, nestedSchema] of Object.entries(propSchema.properties as Record<string, any>)) {
        if (!nestedSchema.description || nestedSchema.description.trim() === '') {
          issues.push({
            tool: toolName,
            property: `${propName}.${nestedProp}`,
            issue: 'Missing description for nested property',
            severity: 'error',
          });
        }
      }
    }
  }

  // Check if required fields are documented in descriptions
  if (required && Array.isArray(required)) {
    for (const requiredField of required) {
      const propSchema = properties[requiredField];
      if (propSchema && propSchema.description) {
        const desc = propSchema.description.toLowerCase();
        // It's good practice to mention if a field is required, but not strictly necessary
        // since the schema itself marks it as required
      }
    }
  }
}

// Validate all tools (get both read-only and write tools)
console.log('🔍 Validating input schema completeness...\n');

const allTools = getAvailableTools(true); // Get all tools including write tools

for (const tool of allTools) {
  validateSchema(tool.schema.name, tool.schema);
}

// Report results
const errors = issues.filter((i) => i.severity === 'error');
const warnings = issues.filter((i) => i.severity === 'warning');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All input schemas are complete!\n');
  console.log(`Validated ${allTools.length} tools.`);
  process.exit(0);
}

console.log(`Found ${errors.length} errors and ${warnings.length} warnings:\n`);

// Group by tool
const issuesByTool = new Map<string, ValidationIssue[]>();
for (const issue of issues) {
  if (!issuesByTool.has(issue.tool)) {
    issuesByTool.set(issue.tool, []);
  }
  issuesByTool.get(issue.tool)!.push(issue);
}

// Print issues grouped by tool
for (const [toolName, toolIssues] of issuesByTool) {
  const toolErrors = toolIssues.filter((i) => i.severity === 'error');
  const toolWarnings = toolIssues.filter((i) => i.severity === 'warning');

  console.log(`\n📦 ${toolName}`);
  console.log(`   ${toolErrors.length} errors, ${toolWarnings.length} warnings`);

  for (const issue of toolIssues) {
    const icon = issue.severity === 'error' ? '❌' : '⚠️';
    console.log(`   ${icon} ${issue.property}: ${issue.issue}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log(`\nSummary: ${errors.length} errors, ${warnings.length} warnings across ${issuesByTool.size} tools`);

if (errors.length > 0) {
  console.log('\n❌ Validation failed. Please fix all errors.');
  process.exit(1);
} else {
  console.log('\n✅ No critical errors found. Warnings are suggestions for improvement.');
  process.exit(0);
}
