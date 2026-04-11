import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolInput } from '../../core/types/index.js';

export type ToolCategory = 'core' | 'advanced';

export interface DeclarativeToolDefinition {
  name: string;
  description?: string;
  requiresWrite: boolean;
  category: ToolCategory;
  inputSchema?: ToolInput;
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
  return {
    name: tool.schema.name,
    description: tool.schema.description,
    requiresWrite: tool.requiresWrite,
    category: tool.category,
    inputSchema: tool.schema.inputSchema,
    execute: (args) => tool.handler(args as TArgs),
  };
}

export function defineLegacyTools<const TArgs extends readonly LegacyToolLike<unknown>[]>(
  tools: TArgs,
): DeclarativeToolDefinition[] {
  return tools.map((tool) => defineLegacyTool(tool));
}
