import type { MCPResponse } from './types.js';

/**
 * Detect whether a thrown value already matches the MCP response shape.
 *
 * @param value - Unknown thrown value
 * @returns True when the value can be returned directly to the MCP client
 */
export function isMCPResponse(value: unknown): value is MCPResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'content' in value &&
    Array.isArray((value as { content?: unknown }).content)
  );
}
