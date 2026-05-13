import { describe, expect, it } from 'vitest';
import type { DeclarativeToolDefinition } from './common.js';
import { buildToolSurfaceJson, classifyToolTier } from './tool-surface.js';

const neutralAnnotations: DeclarativeToolDefinition['annotations'] = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function stubDeclarativeTool(
  fields: Pick<DeclarativeToolDefinition, 'name' | 'title' | 'category' | 'requiresWrite'>,
): DeclarativeToolDefinition {
  return {
    ...fields,
    description: 'desc',
    annotations: neutralAnnotations,
    execute: async () => ({ content: [{ type: 'text', text: '{}' }] }),
  };
}

describe('tool-surface', () => {
  it('classifies tiers with advanced dominating writes and reads', () => {
    expect(
      classifyToolTier(
        stubDeclarativeTool({ name: 'r', title: 'R', category: 'core', requiresWrite: false }),
      ),
    ).toBe('read');

    expect(
      classifyToolTier(
        stubDeclarativeTool({ name: 'w', title: 'W', category: 'core', requiresWrite: true }),
      ),
    ).toBe('write');

    expect(
      classifyToolTier(
        stubDeclarativeTool({ name: 'a', title: 'A', category: 'advanced', requiresWrite: false }),
      ),
    ).toBe('advanced');

    expect(
      classifyToolTier(
        stubDeclarativeTool({ name: 'aw', title: 'AW', category: 'advanced', requiresWrite: true }),
      ),
    ).toBe('advanced');
  });

  it('indexes every declarative tool exactly once across tiers', () => {
    const surface = buildToolSurfaceJson();

    expect(surface.schemaVersion).toBe(2);
    expect(surface.recommendedWorkflows.length).toBe(8);
    expect(surface.registeredPrompts.length).toBeGreaterThanOrEqual(8);
    expect(surface.totalTools).toBeGreaterThan(0);

    const discovered = new Set<string>();
    for (const tier of ['read', 'write', 'advanced'] as const) {
      for (const row of surface.tiers[tier].tools) {
        expect(discovered.has(row.name)).toBe(false);
        discovered.add(row.name);
      }

      expect(surface.tiers[tier].count).toBe(surface.tiers[tier].tools.length);
    }

    expect(discovered.size).toBe(surface.totalTools);
  });
});
