import { describe, expect, it } from 'vitest';
import { getToolDefinitions } from './index.js';

describe('declarative MCP tool contract', () => {
  const fullSurface = getToolDefinitions({ enableWrite: true, enableAdvanced: true });

  it('every enabled tool exposes MCP registration fields', () => {
    expect(fullSurface.length).toBe(45);

    for (const tool of fullSurface) {
      expect(tool.name, 'missing name').toMatch(/^[a-z0-9-]+$/);
      expect(tool.title.length, tool.name).toBeGreaterThan(0);
      expect(tool.annotations, tool.name).toEqual(
        expect.objectContaining({
          readOnlyHint: expect.any(Boolean),
          destructiveHint: expect.any(Boolean),
        }),
      );

      expect(tool.sdkInputSchema, tool.name).toBeDefined();

      if (!tool.requiresWrite) {
        expect(tool.annotations.readOnlyHint, tool.name).toBe(true);
      }
    }
  });
});
