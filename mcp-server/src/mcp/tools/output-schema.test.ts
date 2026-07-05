import { describe, it, expect } from 'vitest';
import { toolDefinitions } from './index.js';

/**
 * Tests for output schema support (SDK 1.29+).
 * Validates that tools with outputSchema have valid Zod raw shapes.
 */

const TOOLS_WITH_OUTPUT_SCHEMA = [
  'get-accounts',
  'get-transactions',
  'get-grouped-categories',
  'get-budget-month',
  'get-financial-insights',
  'get-payees',
  'set-budget',
  'create-transaction',
  'update-transaction',
  'import-transactions',
];

describe('output schemas', () => {
  it('expected tools have outputSchema defined', () => {
    for (const toolName of TOOLS_WITH_OUTPUT_SCHEMA) {
      const tool = toolDefinitions.find((t) => t.name === toolName);
      expect(tool, `Tool ${toolName} should exist`).toBeDefined();
      expect(tool?.outputSchema, `Tool ${toolName} should have outputSchema`).toBeDefined();
    }
  });

  it('all outputSchema values are valid Zod raw shapes', () => {
    const toolsWithSchema = toolDefinitions.filter((t) => t.outputSchema);

    expect(toolsWithSchema.length).toBeGreaterThanOrEqual(TOOLS_WITH_OUTPUT_SCHEMA.length);

    for (const tool of toolsWithSchema) {
      const schema = tool.outputSchema!;

      // Must be a plain object (not null, not array)
      expect(typeof schema).toBe('object');
      expect(schema).not.toBeNull();
      expect(Array.isArray(schema)).toBe(false);

      // Each value should be a Zod type (has parse and safeParse)
      for (const [key, zodType] of Object.entries(schema)) {
        expect(
          typeof zodType?.parse === 'function',
          `${tool.name}.outputSchema.${key} should have parse()`,
        ).toBe(true);
        expect(
          typeof zodType?.safeParse === 'function',
          `${tool.name}.outputSchema.${key} should have safeParse()`,
        ).toBe(true);
      }
    }
  });

  it('all outputSchema shapes include standard envelope fields', () => {
    const toolsWithSchema = toolDefinitions.filter((t) => t.outputSchema);
    const requiredEnvelopeKeys = ['tool', 'title', 'category', 'ok'];

    for (const tool of toolsWithSchema) {
      const schemaKeys = Object.keys(tool.outputSchema!);
      for (const key of requiredEnvelopeKeys) {
        expect(
          schemaKeys.includes(key),
          `${tool.name}.outputSchema should include envelope key "${key}"`,
        ).toBe(true);
      }
    }
  });

  it('envelope fields validate correct types', () => {
    const toolsWithSchema = toolDefinitions.filter((t) => t.outputSchema);

    for (const tool of toolsWithSchema) {
      const schema = tool.outputSchema!;

      // tool field should accept strings
      expect(schema.tool.safeParse('get-accounts').success).toBe(true);
      expect(schema.tool.safeParse(123).success).toBe(false);

      // ok field should accept booleans
      expect(schema.ok.safeParse(true).success).toBe(true);
      expect(schema.ok.safeParse('yes').success).toBe(false);

      // category should accept valid enums
      expect(schema.category.safeParse('core').success).toBe(true);
      expect(schema.category.safeParse('advanced').success).toBe(true);
      expect(schema.category.safeParse('invalid').success).toBe(false);
    }
  });

  it('tools without outputSchema still register correctly', () => {
    const toolsWithout = toolDefinitions.filter((t) => !t.outputSchema);
    // Some tools don't have output schemas yet - that's fine
    for (const tool of toolsWithout) {
      expect(tool.name).toBeTruthy();
      expect(tool.execute).toBeTypeOf('function');
    }
  });
});
