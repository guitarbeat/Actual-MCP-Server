import { promptDefinitions } from '../prompts/index.js';
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

export interface RecommendedWorkflowEntry {
  id: string;
  summary: string;
  /** MCP prompt names that orchestrate this flow (if any). */
  prompts: string[];
  /** Atomic tools often used in this flow (starting points, not exhaustive). */
  starterTools: string[];
  /** read | write | advanced — minimum tier to complete the full flow. */
  minimumTier: ToolSurfaceTierKey;
}

export interface ToolSurfaceJson {
  schemaVersion: 2;
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
  /** Curated outcome-oriented entry points (GoClaw-style routing aid). */
  recommendedWorkflows: RecommendedWorkflowEntry[];
  registeredPrompts: Array<{ name: string; hint: string }>;
  totalTools: number;
  notes: string[];
}

const RECOMMENDED_WORKFLOWS: RecommendedWorkflowEntry[] = [
  {
    id: 'monthly-spending-analysis',
    summary: 'High-level spend for a month then category breakdown.',
    prompts: ['analyze-monthly-spending'],
    starterTools: ['monthly-summary', 'spending-by-category'],
    minimumTier: 'read',
  },
  {
    id: 'financial-health',
    summary: 'Balances, net worth context, and recent trend signals.',
    prompts: ['financial-health-check'],
    starterTools: ['get-accounts', 'balance-history', 'get-financial-insights'],
    minimumTier: 'read',
  },
  {
    id: 'uncategorized-triage',
    summary: 'Transfers first, then uncategorized audit, rules, manual leftovers.',
    prompts: ['triage-uncategorized-transactions'],
    starterTools: [
      'audit-historical-transfers',
      'apply-historical-transfers',
      'audit-uncategorized-transactions',
      'get-rules',
    ],
    minimumTier: 'write',
  },
  {
    id: 'monthly-budget-review',
    summary: 'Budget vs actual for a month and optional replan suggestions.',
    prompts: ['monthly-budget-review'],
    starterTools: ['get-budget-month', 'spending-by-category', 'recommend-budget-plan'],
    minimumTier: 'read',
  },
  {
    id: 'reconcile-pass',
    summary: 'Per-account reconciliation against a statement balance.',
    prompts: ['reconcile-accounts-pass'],
    starterTools: ['get-accounts', 'get-account-balance', 'get-transactions', 'reconcile-account'],
    minimumTier: 'write',
  },
  {
    id: 'schedule-review',
    summary: 'List schedules and spot upcoming or stale recurring items.',
    prompts: ['schedule-health-check'],
    starterTools: ['get-schedules', 'get-transactions'],
    minimumTier: 'read',
  },
  {
    id: 'bank-import-validate',
    summary: 'Refresh bank imports then sample transactions for sanity.',
    prompts: ['import-sync-checklist'],
    starterTools: ['import-transactions', 'get-transactions'],
    minimumTier: 'write',
  },
  {
    id: 'historical-transfer-batch',
    summary: 'Audit strict transfer pairs then apply with explicit candidate ids.',
    prompts: ['historical-transfer-review'],
    starterTools: ['audit-historical-transfers', 'apply-historical-transfers'],
    minimumTier: 'write',
  },
];

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
    schemaVersion: 2,
    resourceUri: 'actual://mcp/tool-surface',
    tiers: {
      read: buildTierProjection('read', byTier.read),
      write: buildTierProjection('write', byTier.write),
      advanced: buildTierProjection('advanced', byTier.advanced),
    },
    recommendedWorkflows: RECOMMENDED_WORKFLOWS,
    registeredPrompts: promptDefinitions
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((prompt) => ({
        name: prompt.name,
        hint: summarizeOneLine(prompt.description),
      })),
    totalTools: toolDefinitions.length,
    notes: [
      'This catalog is derived from declarative registrations in src/mcp/tools; `read` excludes tools marked advanced even when they require write.',
      'Streamable HTTP uses one MCP server instance per HTTP session while sharing a single process-wide Actual Budget client and active budget.',
      'Use recommendedWorkflows for outcome-oriented routing; starterTools are hints—follow prompt text when present.',
    ],
  };
}
