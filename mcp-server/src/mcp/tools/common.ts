import { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export type ToolCategory = 'core' | 'nini';

export interface DeclarativeToolDefinition {
  name: string;
  description?: string;
  requiresWrite: boolean;
  category: ToolCategory;
  inputSchema?: z.ZodTypeAny;
  execute: (args: Record<string, unknown>) => Promise<CallToolResult>;
}

const looseToolInputSchema = z.object({}).catchall(z.unknown());

type LegacyToolHandler<TArgs> = {
  bivarianceHack: (args: TArgs) => Promise<CallToolResult>;
}['bivarianceHack'];

interface LegacyToolLike<TArgs = Record<string, unknown>> {
  schema: {
    name: string;
    description?: string;
  };
  handler: LegacyToolHandler<TArgs>;
  requiresWrite: boolean;
  category: ToolCategory;
}

export function defineLegacyTool<TArgs>(
  tool: LegacyToolLike<TArgs>,
  inputSchema: z.ZodTypeAny = looseToolInputSchema,
): DeclarativeToolDefinition {
  return {
    name: tool.schema.name,
    description: tool.schema.description,
    requiresWrite: tool.requiresWrite,
    category: tool.category,
    inputSchema,
    execute: (args) => tool.handler(args as TArgs),
  };
}

export function defineLegacyTools<const TArgs extends readonly LegacyToolLike<unknown>[]>(
  tools: TArgs,
  inputSchema: z.ZodTypeAny = looseToolInputSchema,
): DeclarativeToolDefinition[] {
  return tools.map((tool) => defineLegacyTool(tool, inputSchema));
}
