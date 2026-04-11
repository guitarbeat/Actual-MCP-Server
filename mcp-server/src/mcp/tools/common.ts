import { z } from 'zod';
import type { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { ToolInput } from '../../core/types/index.js';

export type ToolCategory = 'core' | 'advanced';

export interface ToolResultEnvelope {
  tool: string;
  title: string;
  category: ToolCategory;
  ok: boolean;
  error?: boolean;
  message?: string;
  suggestion?: string;
  data?: unknown;
}

export interface DeclarativeToolDefinition {
  name: string;
  title: string;
  description?: string;
  requiresWrite: boolean;
  category: ToolCategory;
  inputSchema?: ToolInput;
  sdkInputSchema?: Record<string, z.ZodTypeAny>;
  annotations: ToolAnnotations;
  execute: (args: Record<string, unknown>) => Promise<CallToolResult>;
}

type LegacyToolHandler<TArgs> = {
  bivarianceHack: (args: TArgs) => Promise<CallToolResult>;
}['bivarianceHack'];

interface LegacyToolLike<TArgs = Record<string, unknown>> {
  schema: {
    name: string;
    description?: string;
    inputSchema?: ToolInput;
  };
  handler: LegacyToolHandler<TArgs>;
  requiresWrite: boolean;
  category: ToolCategory;
}

export function defineLegacyTool<TArgs>(tool: LegacyToolLike<TArgs>): DeclarativeToolDefinition {
  const title = humanizeToolName(tool.schema.name);

  return {
    name: tool.schema.name,
    title,
    description: tool.schema.description,
    requiresWrite: tool.requiresWrite,
    category: tool.category,
    inputSchema: tool.schema.inputSchema,
    sdkInputSchema: jsonSchemaToZodRawShape(tool.schema.inputSchema),
    annotations: createToolAnnotations(tool.schema.name, tool.requiresWrite),
    execute: (args) => tool.handler(args as TArgs),
  };
}

export function normalizeToolResult(
  tool: Pick<DeclarativeToolDefinition, 'name' | 'title' | 'category'>,
  result: CallToolResult,
): CallToolResult {
  const payload = result.structuredContent ?? extractStructuredFields(result);

  return {
    ...result,
    structuredContent: {
      ...payload,
      tool: tool.name,
      title: tool.title,
      category: tool.category,
      ok: !result.isError,
    },
  };
}

export function humanizeToolName(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function createToolAnnotations(name: string, requiresWrite: boolean): ToolAnnotations {
  const lowerName = name.toLowerCase();
  const destructive =
    /^delete-/.test(lowerName) ||
    /^close-/.test(lowerName) ||
    /^reset-/.test(lowerName) ||
    lowerName === 'merge-payees';
  const idempotent =
    !requiresWrite ||
    /^get-/.test(lowerName) ||
    /^audit-/.test(lowerName) ||
    /^monthly-/.test(lowerName) ||
    /^spending-/.test(lowerName) ||
    /^financial-/.test(lowerName) ||
    /^balance-/.test(lowerName);

  return {
    readOnlyHint: !requiresWrite,
    destructiveHint: destructive,
    idempotentHint: idempotent,
    // This server operates over a bounded Actual Budget domain, not the open web.
    openWorldHint: false,
  };
}

export function jsonSchemaToZodRawShape(
  inputSchema?: ToolInput,
): Record<string, z.ZodTypeAny> | undefined {
  const root = asRecord(inputSchema);
  const properties = asRecord(root?.properties);

  if (!root || root.type !== 'object' || !properties) {
    return undefined;
  }

  const required = new Set(asStringArray(root.required));

  return Object.fromEntries(
    Object.entries(properties).map(([key, propertySchema]) => {
      const resolvedSchema = resolveSchema(propertySchema, root);
      let parser = jsonSchemaToZodType(resolvedSchema, root);

      if (!required.has(key)) {
        parser = parser.optional();
      }

      return [key, parser];
    }),
  );
}

function jsonSchemaToZodType(schema: unknown, root: Record<string, unknown>): z.ZodTypeAny {
  const record = resolveSchema(schema, root);

  if (!record) {
    return z.any();
  }

  const variants = schemaVariants(record, root);
  if (variants) {
    return variants;
  }

  const typeValue = record.type;

  if (Array.isArray(typeValue)) {
    const mapped = typeValue.map((value) => {
      if (value === 'null') {
        return z.null();
      }

      return jsonSchemaToZodType({ ...record, type: value }, root);
    });

    return describe(record, unionOf(mapped));
  }

  if (record.const !== undefined) {
    return isLiteralPrimitive(record.const)
      ? describe(record, z.literal(record.const))
      : describe(record, z.any());
  }

  if (Array.isArray(record.enum) && record.enum.length > 0) {
    const literals = record.enum.map((value) =>
      isLiteralPrimitive(value) ? z.literal(value) : z.any(),
    );

    return describe(record, unionOf(literals));
  }

  switch (typeValue) {
    case 'string':
      return describe(record, stringSchema(record));
    case 'integer':
      return describe(record, numberSchema(record, true));
    case 'number':
      return describe(record, numberSchema(record, false));
    case 'boolean':
      return describe(record, z.boolean());
    case 'array':
      return describe(record, arraySchema(record, root));
    case 'object':
      return describe(record, objectSchema(record, root));
    case 'null':
      return describe(record, z.null());
    default:
      return describe(record, z.any());
  }
}

function objectSchema(
  schema: Record<string, unknown>,
  root: Record<string, unknown>,
): z.ZodTypeAny {
  const properties = asRecord(schema.properties);

  if (!properties) {
    return schema.additionalProperties === false ? z.object({}).strict() : z.record(z.any());
  }

  const required = new Set(asStringArray(schema.required));
  const shape = Object.fromEntries(
    Object.entries(properties).map(([key, propertySchema]) => {
      const resolved = resolveSchema(propertySchema, root);
      let parser = jsonSchemaToZodType(resolved, root);

      if (!required.has(key)) {
        parser = parser.optional();
      }

      return [key, parser];
    }),
  );

  const object = z.object(shape);
  return schema.additionalProperties === false ? object.strict() : object.passthrough();
}

function arraySchema(schema: Record<string, unknown>, root: Record<string, unknown>): z.ZodTypeAny {
  const items = resolveSchema(schema.items, root);
  let parser = z.array(items ? jsonSchemaToZodType(items, root) : z.any());

  if (typeof schema.minItems === 'number') {
    parser = parser.min(schema.minItems);
  }

  if (typeof schema.maxItems === 'number') {
    parser = parser.max(schema.maxItems);
  }

  return parser;
}

function stringSchema(schema: Record<string, unknown>): z.ZodTypeAny {
  let parser = z.string();

  if (typeof schema.minLength === 'number') {
    parser = parser.min(schema.minLength);
  }

  if (typeof schema.maxLength === 'number') {
    parser = parser.max(schema.maxLength);
  }

  if (typeof schema.pattern === 'string') {
    try {
      parser = parser.regex(new RegExp(schema.pattern));
    } catch {
      return parser;
    }
  }

  return parser;
}

function numberSchema(schema: Record<string, unknown>, integer: boolean): z.ZodTypeAny {
  let parser = z.number();

  if (integer) {
    parser = parser.int();
  }

  if (typeof schema.minimum === 'number') {
    parser = parser.min(schema.minimum);
  }

  if (typeof schema.maximum === 'number') {
    parser = parser.max(schema.maximum);
  }

  if (typeof schema.exclusiveMinimum === 'number') {
    parser = parser.gt(schema.exclusiveMinimum);
  }

  if (typeof schema.exclusiveMaximum === 'number') {
    parser = parser.lt(schema.exclusiveMaximum);
  }

  return parser;
}

function schemaVariants(
  schema: Record<string, unknown>,
  root: Record<string, unknown>,
): z.ZodTypeAny | undefined {
  const unions = [schema.oneOf, schema.anyOf]
    .filter(Array.isArray)
    .flatMap((value) => value as unknown[]);

  if (unions.length > 0) {
    return describe(schema, unionOf(unions.map((variant) => jsonSchemaToZodType(variant, root))));
  }

  return undefined;
}

function unionOf(parsers: z.ZodTypeAny[]): z.ZodTypeAny {
  const unique = parsers.filter((parser, index) => parsers.indexOf(parser) === index);

  if (unique.length === 0) {
    return z.any();
  }

  if (unique.length === 1) {
    return unique[0];
  }

  return z.union([unique[0], unique[1], ...unique.slice(2)] as [
    z.ZodTypeAny,
    z.ZodTypeAny,
    ...z.ZodTypeAny[],
  ]);
}

function describe(schema: Record<string, unknown>, parser: z.ZodTypeAny): z.ZodTypeAny {
  return typeof schema.description === 'string' ? parser.describe(schema.description) : parser;
}

function resolveSchema(
  schema: unknown,
  root: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const record = asRecord(schema);

  if (!record) {
    return undefined;
  }

  if (typeof record.$ref !== 'string' || !record.$ref.startsWith('#/')) {
    return record;
  }

  const target = record.$ref
    .slice(2)
    .split('/')
    .reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[segment];
    }, root);

  const resolved = asRecord(target);
  if (!resolved) {
    return record;
  }

  const { $ref: _ref, ...localOverrides } = record;
  return {
    ...resolved,
    ...localOverrides,
  };
}

function extractStructuredFields(
  result: CallToolResult,
): Omit<ToolResultEnvelope, 'tool' | 'title' | 'category' | 'ok'> {
  const textContent = result.content
    .filter(
      (item): item is Extract<CallToolResult['content'][number], { type: 'text' }> =>
        item.type === 'text',
    )
    .map((item) => item.text.trim())
    .filter(Boolean);

  const combinedText = textContent.join('\n\n').trim();
  const parsed = textContent.length === 1 ? tryParseJson(textContent[0]) : undefined;

  if (result.isError) {
    if (isErrorPayload(parsed)) {
      return {
        error: true,
        message: parsed.message,
        suggestion: parsed.suggestion,
        data: parsed,
      };
    }

    return {
      error: true,
      message: combinedText || 'Tool execution failed.',
    };
  }

  if (parsed !== undefined) {
    return {
      data: parsed,
      message: typeof parsed === 'string' ? parsed : undefined,
    };
  }

  if (combinedText) {
    return {
      message: combinedText,
    };
  }

  return {};
}

function tryParseJson(value: string): unknown | undefined {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function isErrorPayload(
  value: unknown,
): value is { error: true; message: string; suggestion?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    (value as { error?: unknown }).error === true &&
    typeof (value as { message?: unknown }).message === 'string'
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function isLiteralPrimitive(value: unknown): value is string | number | boolean | null {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  );
}
