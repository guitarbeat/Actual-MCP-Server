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

interface LegacyToolLike {
  schema: {
    name: string;
    description?: string;
  };
  handler: (args: any) => Promise<CallToolResult>;
  requiresWrite: boolean;
  category: ToolCategory;
}

export function defineLegacyTool(
  tool: LegacyToolLike,
  inputSchema: z.ZodTypeAny = looseToolInputSchema,
): DeclarativeToolDefinition {
  return {
    name: tool.schema.name,
    description: tool.schema.description,
    requiresWrite: tool.requiresWrite,
    category: tool.category,
    inputSchema,
    execute: tool.handler,
  };
}

export function defineLegacyTools(
  tools: LegacyToolLike[],
  inputSchema: z.ZodTypeAny = looseToolInputSchema,
): DeclarativeToolDefinition[] {
  return tools.map((tool) => defineLegacyTool(tool, inputSchema));
}
