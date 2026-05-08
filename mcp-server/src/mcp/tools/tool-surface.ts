import type { DeclarativeToolDefinition } from './common.js';
import { toolDefinitions } from './index.js';

export type ToolSurfaceTierKey = 'read' | 'write' | 'advanced';

const TIER_GUIDANCE: Record<ToolSurfaceTierKey, { summary: string; activation: string }> = {
  read: {
    summary: 'Read-only Actual Budget MCP tools.',
    activation: 'Enabled by default; no `--enable-write` required.',
  },
  write: {
    summary:
      'Writes and imports that mutate budget data (`requiresWrite`). Excludes advanced-category tools.',
    activation: 'Start the server with `--enable-write` (and remote HTTP bearer if applicable).',
  },
  advanced: {
    summary:
      'Higher-risk flows (multi-budget introspection or switching, account lifecycle, destructive deletes).',
    activation:
      'Start the server with `--enable-advanced` (includes read + write advanced tools depending on flags).',
  },
};

function summarizeOneLine(description?: string): string {
  const line =
    description === undefined || description.length === 0 ? 'No description.' : description;
  const [firstRaw] = line.split(/\r?\n/);
  return firstRaw ? firstRaw.replace(/\s+/g, ' ').trim() : '';
}

export function classifyToolTier(tool: DeclarativeToolDefinition): ToolSurfaceTierKey {
  if (tool.category === 'advanced') {
    return 'advanced';
  }

  if (tool.requiresWrite) {
    return 'write';
  }

  return 'read';
}

export interface ToolSurfaceJson {
  schemaVersion: 1;
  resourceUri: 'actual://mcp/tool-surface';
  tiers: Record<
    ToolSurfaceTierKey,
    {
      summary: string;
      activation: string;
      tools: Array<{ name: string; title: string; hint: string }>;
      count: number;
    }
  >;
  totalTools: number;
  notes: string[];
}

export function buildToolSurfaceJson(): ToolSurfaceJson {
  const byTier: Record<ToolSurfaceTierKey, DeclarativeToolDefinition[]> = {
    read: [],
    write: [],
    advanced: [],
  };

  for (const tool of toolDefinitions) {
    const tierKey = classifyToolTier(tool);
    byTier[tierKey].push(tool);
  }

  function buildTierProjection(
    tierKey: ToolSurfaceTierKey,
    defs: DeclarativeToolDefinition[],
  ): ToolSurfaceJson['tiers']['read'] {
    const sorted = [...defs].sort((left, right) => left.name.localeCompare(right.name));
    const tierMeta = TIER_GUIDANCE[tierKey];
    return {
      summary: tierMeta.summary,
      activation: tierMeta.activation,
      count: sorted.length,
      tools: sorted.map((t) => ({
        name: t.name,
        title: t.title,
        hint: summarizeOneLine(t.description),
      })),
    };
  }

  return {
    schemaVersion: 1,
    resourceUri: 'actual://mcp/tool-surface',
    tiers: {
      read: buildTierProjection('read', byTier.read),
      write: buildTierProjection('write', byTier.write),
      advanced: buildTierProjection('advanced', byTier.advanced),
    },
    totalTools: toolDefinitions.length,
    notes: [
      'This catalog is derived from declarative registrations in src/mcp/tools; `read` excludes tools marked advanced even when they require write.',
      'Streamable HTTP uses one MCP server instance per HTTP session while sharing a single process-wide Actual Budget client and active budget.',
    ],
  };
}
